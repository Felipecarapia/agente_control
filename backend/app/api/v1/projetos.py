from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.validators import IDValidator
# Removida restrição de permissão - qualquer usuário autenticado pode cobrar
from app.models.projeto import Projeto
from app.models.usuario import Usuario
from app.schemas.projeto import ProjetoCreate, ProjetoUpdate, ProjetoResponse
from app.schemas.mensagem import ProjectNudgeRequest
from app.services.mensagem_service import send_project_nudge, get_project_members

router = APIRouter(prefix="/projetos", tags=["projetos"])


@router.get("")
def list_projetos(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todos os projetos.
    Retorna lista vazia se não houver projetos (nunca retorna 500).
    """
    try:
        projetos = db.query(Projeto).all()
        # Converter para schema Pydantic para serialização correta
        from app.schemas.projeto import ProjetoResponse
        projetos_data = [ProjetoResponse.model_validate(p) for p in projetos]
        return success_response(data=projetos_data)
    except Exception as e:
        # Em caso de erro, retornar lista vazia ao invés de quebrar
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao listar projetos: {e}", exc_info=True)
        return success_response(data=[])


@router.get("/{projeto_id}", response_model=ProjetoResponse)
def get_projeto(
    projeto_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    # Validar ID
    if projeto_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do projeto deve ser maior que 0",
            status_code=400
        )
    
    obj = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not obj:
        return error_response(
            code="PROJECT_NOT_FOUND",
            message="Projeto não encontrado",
            status_code=404
        )
    return success_response(data=obj)


@router.post("", response_model=ProjetoResponse, status_code=status.HTTP_201_CREATED)
def create_projeto(
    data: ProjetoCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    try:
        obj = Projeto(**data.model_dump(), usuario_id=current_user.id)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return success_response(data=obj, status_code=201)
    except Exception as e:
        db.rollback()
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar projeto: {str(e)}",
            status_code=500
        )


@router.patch("/{projeto_id}", response_model=ProjetoResponse)
def update_projeto(
    projeto_id: int,
    data: ProjetoUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    # Validar ID
    if projeto_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do projeto deve ser maior que 0",
            status_code=400
        )
    
    obj = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not obj:
        return error_response(
            code="PROJECT_NOT_FOUND",
            message="Projeto não encontrado",
            status_code=404
        )
    
    try:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=obj)
    except Exception as e:
        db.rollback()
        return error_response(
            code="UPDATE_ERROR",
            message=f"Erro ao atualizar projeto: {str(e)}",
            status_code=500
        )


@router.delete("/{projeto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_projeto(
    projeto_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    obj = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    db.delete(obj)
    db.commit()


@router.get("/{projeto_id}/members", response_model=list[dict])
def get_projeto_members(
    projeto_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista membros envolvidos no projeto."""
    projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return get_project_members(db, projeto_id)


@router.post("/{projeto_id}/nudge", status_code=status.HTTP_201_CREATED)
def nudge_projeto(
    projeto_id: int,
    data: ProjectNudgeRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],  # Removida restrição de permissão
):
    """Envia notificação de cobrança para membros do projeto."""
    # Validar ID
    if projeto_id <= 0:
        return error_response(
            code="INVALID_ID",
            message="ID do projeto deve ser maior que 0",
            status_code=400
        )
    
    projeto = db.query(Projeto).filter(Projeto.id == projeto_id).first()
    if not projeto:
        return error_response(
            code="PROJECT_NOT_FOUND",
            message="Projeto não encontrado",
            status_code=404
        )

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        notifications = send_project_nudge(
            db=db,
            project_id=projeto_id,
            recipient_user_ids=data.recipient_user_ids,
            preset=data.preset,
            custom_message=data.custom_message,
            author_user_id=current_user.id,
            request_ip=ip_address,
            user_agent=user_agent,
        )
        return success_response(
            data={
                "message": f"{len(notifications)} notificações enviadas",
                "count": len(notifications),
            },
            status_code=201
        )
    except ValueError as e:
        return error_response(
            code="VALIDATION_ERROR",
            message=str(e),
            status_code=400
        )
