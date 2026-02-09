from typing import Annotated, Optional
from decimal import Decimal
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.validators import IDValidator
from app.core.rbac import require_role, ROLE_ADMIN, has_role, has_any_role
from app.models.usuario import Usuario
from app.models.pipeline import (
    Pipeline, PipelineStage, Deal, DealAssignee, DealTag, DealTagLink,
    DealActivity, DealNote, DealStageHistory, DealPriority, DealStatus
)
from app.models.cliente import Cliente
from app.schemas.pipeline import (
    PipelineCreate, PipelineUpdate, PipelineResponse,
    PipelineStageCreate, PipelineStageUpdate, PipelineStageResponse, PipelineStageReorderRequest,
    DealCreate, DealUpdate, DealResponse, DealMoveRequest, DealKanbanResponse,
    StageWithDealsResponse, PipelineKanbanResponse,
    DealActivityCreate, DealActivityUpdate, DealActivityResponse,
    DealNoteCreate, DealNoteResponse,
    DealBulkActionRequest
)

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


# ============== PIPELINES ==============

@router.get("")
def list_pipelines(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista todos os pipelines.
    REGRA: Falta de pipeline NÃO é erro - é estado inicial.
    Retorna sempre 200 com lista vazia se não houver pipelines.
    """
    try:
        pipelines = db.query(Pipeline).order_by(Pipeline.is_default.desc(), Pipeline.name).all()
        # Se não houver pipelines, retornar lista vazia (não erro)
        return success_response(data=pipelines if pipelines else [])
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao listar pipelines: {str(e)}", exc_info=True)
        # Em caso de erro, retornar lista vazia para não quebrar o frontend
        return success_response(data=[], meta={"requiresSetup": True, "message": "Nenhum pipeline encontrado. Crie um pipeline primeiro."})


@router.get("/{pipeline_id}", response_model=PipelineResponse)
def get_pipeline(
    pipeline_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Obtém um pipeline específico."""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        return error_response(
            code="PIPELINE_NOT_FOUND",
            message="Pipeline não encontrado",
            status_code=404
        )
    return success_response(data=pipeline)


@router.post("/bootstrap")
def bootstrap_pipeline(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Cria pipeline padrão + etapas padrão se não existir (IDEMPOTENTE).
    Pode ser chamado múltiplas vezes sem duplicar dados.
    Retorna: { ok: true, data: { pipelineId, created, pipelineName } }
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        # Verificar se já existe ao menos um pipeline
        existing_pipeline = db.query(Pipeline).first()
        
        if existing_pipeline:
            # Já existe pipeline - retornar o primeiro (ou o padrão se houver)
            default_pipeline = db.query(Pipeline).filter(Pipeline.is_default == True).first()
            pipeline = default_pipeline or existing_pipeline
            
            return success_response(
                data={
                    "pipelineId": pipeline.id,
                    "created": False,
                    "pipelineName": pipeline.name
                },
                meta={"message": "Pipeline já existe"},
                request_id=request_id
            )
        
        # Não existe pipeline - criar pipeline padrão
        pipeline = Pipeline(
            name="Vendas",
            description="Pipeline padrão de vendas",
            is_default=True,
            created_by_user_id=current_user.id
        )
        db.add(pipeline)
        db.flush()
        
        # Criar stages padrão (idempotente - verificar se já existe antes de criar)
        stages_data = [
            ("Lead", "LEADS", 0, None, None),
            ("Pré-proposta", "PRE_PROPOSAL", 1, None, None),
            ("Proposta", "PROPOSAL", 2, None, None),
            ("Negociação", "NEGOTIATION", 3, None, None),
            ("Fechado", "WON", 4, None, "#10B981"),
            ("Perdido", "LOST", 5, None, "#EF4444"),
        ]
        
        for name, key, order_index, wip_limit, color in stages_data:
            # Verificar se stage já existe (idempotência)
            existing_stage = db.query(PipelineStage).filter(
                PipelineStage.pipeline_id == pipeline.id,
                PipelineStage.name == name
            ).first()
            
            if not existing_stage:
                stage = PipelineStage(
                    pipeline_id=pipeline.id,
                    name=name,
                    key=key,
                    order_index=order_index,
                    wip_limit=wip_limit,
                    color=color
                )
                db.add(stage)
        
        db.commit()
        db.refresh(pipeline)
        
        return success_response(
            data={
                "pipelineId": pipeline.id,
                "created": True,
                "pipelineName": pipeline.name
            },
            meta={"message": "Pipeline padrão criado com sucesso"},
            request_id=request_id
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erro ao criar pipeline bootstrap: {str(e)}", exc_info=True, extra={"request_id": request_id})
        db.rollback()
        return error_response(
            code="BOOTSTRAP_ERROR",
            message=f"Erro ao criar pipeline padrão: {str(e)}",
            status_code=500,
            request_id=request_id
        )


@router.post("", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
def create_pipeline(
    data: PipelineCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """Cria um novo pipeline (apenas ADMIN)."""
    if data.is_default:
        # Remover default de outros pipelines
        db.query(Pipeline).filter(Pipeline.is_default == True).update({"is_default": False})
    
    pipeline = Pipeline(
        name=data.name,
        description=data.description,
        is_default=data.is_default,
        created_by_user_id=current_user.id
    )
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.patch("/{pipeline_id}", response_model=PipelineResponse)
def update_pipeline(
    pipeline_id: uuid.UUID,
    data: PipelineUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """Atualiza um pipeline (apenas ADMIN)."""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline não encontrado")
    
    if data.is_default is not None and data.is_default:
        # Remover default de outros pipelines
        db.query(Pipeline).filter(Pipeline.is_default == True, Pipeline.id != pipeline_id).update({"is_default": False})
    
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(pipeline, k, v)
    
    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pipeline(
    pipeline_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """Deleta um pipeline (apenas ADMIN)."""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline não encontrado")
    
    # Verificar se tem deals
    deal_count = db.query(Deal).filter(Deal.pipeline_id == pipeline_id).count()
    if deal_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível deletar pipeline com {deal_count} deal(s). Mova os deals primeiro."
        )
    
    db.delete(pipeline)
    db.commit()


# ============== PIPELINE STAGES ==============

@router.get("/{pipeline_id}/stages", response_model=list[PipelineStageResponse])
def list_stages(
    pipeline_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista stages de um pipeline."""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline não encontrado")
    
    return db.query(PipelineStage).filter(
        PipelineStage.pipeline_id == pipeline_id
    ).order_by(PipelineStage.order_index).all()


@router.post("/{pipeline_id}/stages", response_model=PipelineStageResponse, status_code=status.HTTP_201_CREATED)
def create_stage(
    pipeline_id: uuid.UUID,
    data: PipelineStageCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """Cria uma nova stage (apenas ADMIN)."""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline não encontrado")
    
    # Se não especificar order_index, colocar no final
    if data.order_index is None:
        max_order = db.query(func.max(PipelineStage.order_index)).filter(
            PipelineStage.pipeline_id == pipeline_id
        ).scalar() or 0
        order_index = max_order + 1
    else:
        order_index = data.order_index
    
    stage = PipelineStage(
        pipeline_id=pipeline_id,
        name=data.name,
        key=data.key,
        order_index=order_index,
        wip_limit=data.wip_limit,
        color=data.color
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage


@router.patch("/stages/{stage_id}", response_model=PipelineStageResponse)
def update_stage(
    stage_id: uuid.UUID,
    data: PipelineStageUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """Atualiza uma stage (apenas ADMIN)."""
    stage = db.query(PipelineStage).filter(PipelineStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage não encontrada")
    
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(stage, k, v)
    
    db.commit()
    db.refresh(stage)
    return stage


@router.delete("/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stage(
    stage_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """Deleta uma stage (apenas ADMIN)."""
    stage = db.query(PipelineStage).filter(PipelineStage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage não encontrada")
    
    # Verificar se tem deals
    deal_count = db.query(Deal).filter(Deal.stage_id == stage_id).count()
    if deal_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível deletar stage com {deal_count} deal(s). Mova os deals primeiro."
        )
    
    db.delete(stage)
    db.commit()


@router.post("/{pipeline_id}/stages/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_stages(
    pipeline_id: uuid.UUID,
    data: PipelineStageReorderRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_role(ROLE_ADMIN))],
):
    """Reordena as stages de um pipeline (apenas ADMIN)."""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline não encontrado")
    
    # Validar que todas as stages pertencem ao pipeline
    stage_ids = [s["stageId"] for s in data.stages]
    stages = db.query(PipelineStage).filter(
        PipelineStage.id.in_(stage_ids),
        PipelineStage.pipeline_id == pipeline_id
    ).all()
    
    if len(stages) != len(stage_ids):
        raise HTTPException(status_code=400, detail="Uma ou mais stages não pertencem a este pipeline")
    
    # Atualizar order_index
    for item in data.stages:
        db.query(PipelineStage).filter(PipelineStage.id == item["stageId"]).update({
            "order_index": item["orderIndex"]
        })
    
    db.commit()

