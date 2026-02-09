from typing import Annotated, Optional, List, Dict, Any
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, File, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
import logging

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.rbac import require_any_role, ROLE_ADMIN, ROLE_PROJECT_MANAGER
from app.core.response import success_response, error_response
from app.models.usuario import Usuario
from app.models.task_notion import (
    TaskDatabase, TaskProperty, TaskPropertyValue, TaskView,
    TaskBlock, TaskComment, TaskMention, TaskAttachment, TaskTemplate
)
from app.models.tarefa import Tarefa
from app.schemas.task_notion import (
    TaskDatabaseCreate, TaskDatabaseUpdate, TaskDatabaseResponse,
    TaskPropertyCreate, TaskPropertyUpdate, TaskPropertyResponse,
    TaskPropertyValueCreate, TaskPropertyValueUpdate, TaskPropertyValueResponse,
    TaskViewCreate, TaskViewUpdate, TaskViewResponse,
    TaskBlockCreate, TaskBlockUpdate, TaskBlockResponse,
    TaskCommentCreate, TaskCommentResponse,
    TaskAttachmentCreate, TaskAttachmentResponse,
    TaskTemplateCreate, TaskTemplateUpdate, TaskTemplateResponse,
    TaskWithNotionResponse
)

router = APIRouter(prefix="/task-notion", tags=["task-notion"])


# ============== Task Databases ==============

@router.get("/databases")
def list_task_databases(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista todas as bases de tarefas."""
    try:
        databases = db.query(TaskDatabase).all()
        return success_response(data=databases if databases else [])
    except Exception as e:
        # Em caso de erro (tabela não existe), retornar lista vazia
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Erro ao listar databases: {e}")
        return success_response(data=[])


@router.get("/databases/{database_id}")
def get_task_database(
    database_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Obtém detalhes de uma base de tarefas com properties e views do usuário."""
    database = db.query(TaskDatabase).filter(TaskDatabase.id == database_id).first()
    if not database:
        return error_response(
            code="DATABASE_NOT_FOUND",
            message="Base de tarefas não encontrada",
            status_code=404
        )
    return success_response(data=database)


@router.get("/databases/default")
def get_default_task_database(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Obtém a base de tarefas padrão. Retorna null se não existir (não quebra a página).
    Endpoint opcional - não deve retornar erro 422.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        database = db.query(TaskDatabase).filter(TaskDatabase.is_default == True).first()
        if not database:
            # Retornar null ao invés de erro para não quebrar o frontend
            return success_response(data=None, request_id=request_id)
        
        # Converter para dict para garantir serialização correta
        database_dict = {
            "id": database.id,
            "name": database.name,
            "description": database.description,
            "is_default": database.is_default,
            "created_by_user_id": database.created_by_user_id,
            "created_at": database.created_at.isoformat() if database.created_at else None,
            "updated_at": database.updated_at.isoformat() if database.updated_at else None,
        }
        
        return success_response(data=database_dict, request_id=request_id)
    except Exception as e:
        # Em caso de erro (tabela não existe, etc), retornar null
        logger = logging.getLogger(__name__)
        logger.warning(f"Erro ao buscar database padrão: {e}", extra={"request_id": request_id})
        return success_response(data=None, request_id=request_id)


@router.post("/databases", response_model=TaskDatabaseResponse, status_code=status.HTTP_201_CREATED)
def create_task_database(
    data: TaskDatabaseCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role([ROLE_ADMIN, ROLE_PROJECT_MANAGER]))],
):
    """Cria uma nova base de tarefas (apenas admin/gerente)."""
    # Se marcar como default, desmarcar outros
    if data.is_default:
        db.query(TaskDatabase).filter(TaskDatabase.is_default == True).update({"is_default": False})
    
    database = TaskDatabase(
        name=data.name,
        description=data.description,
        is_default=data.is_default,
        created_by_user_id=current_user.id
    )
    db.add(database)
    db.commit()
    db.refresh(database)
    return success_response(data=database, status_code=201)


# ============== Task Properties ==============

@router.get("/databases/default/properties")
def list_default_task_properties(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """
    Lista propriedades da base de tarefas padrão. Retorna lista vazia se não existir.
    Endpoint opcional - não deve retornar erro 422.
    """
    request_id = getattr(request.state, "request_id", None)
    
    try:
        database = db.query(TaskDatabase).filter(TaskDatabase.is_default == True).first()
        if not database:
            # Retornar lista vazia ao invés de erro
            return success_response(data=[], request_id=request_id)
        
        properties = db.query(TaskProperty).filter(
            TaskProperty.task_database_id == database.id
        ).order_by(TaskProperty.order_index).all()
        
        # Converter para dict para garantir serialização correta
        properties_data = []
        for p in properties:
            prop_dict = {
                "id": p.id,
                "task_database_id": p.task_database_id,
                "key": p.key,
                "name": p.name,
                "type": p.type,
                "config_json": p.config_json,
                "order_index": p.order_index,
                "is_required": p.is_required,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            properties_data.append(prop_dict)
        
        return success_response(data=properties_data, request_id=request_id)
    except Exception as e:
        # Em caso de erro, retornar lista vazia
        logger = logging.getLogger(__name__)
        logger.warning(f"Erro ao buscar properties do database padrão: {e}", extra={"request_id": request_id})
        return success_response(data=[], request_id=request_id)


@router.get("/databases/{database_id}/properties", response_model=List[TaskPropertyResponse])
def list_task_properties(
    database_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista propriedades de uma base de tarefas."""
    database = db.query(TaskDatabase).filter(TaskDatabase.id == database_id).first()
    if not database:
        return error_response(
            code="DATABASE_NOT_FOUND",
            message="Base de tarefas não encontrada",
            status_code=404
        )
    
    properties = db.query(TaskProperty).filter(
        TaskProperty.task_database_id == database_id
    ).order_by(TaskProperty.order_index).all()
    return success_response(data=properties if properties else [])


@router.post("/properties", response_model=TaskPropertyResponse, status_code=status.HTTP_201_CREATED)
def create_task_property(
    data: TaskPropertyCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role([ROLE_ADMIN, ROLE_PROJECT_MANAGER]))],
):
    """Cria uma nova propriedade (apenas admin/gerente)."""
    # Verificar se database existe
    database = db.query(TaskDatabase).filter(TaskDatabase.id == data.task_database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Base de tarefas não encontrada")
    
    # Verificar se key já existe neste database
    existing = db.query(TaskProperty).filter(
        TaskProperty.task_database_id == data.task_database_id,
        TaskProperty.key == data.key
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Propriedade com key '{data.key}' já existe neste database")
    
    property = TaskProperty(
        task_database_id=data.task_database_id,
        key=data.key,
        name=data.name,
        type=data.type,
        config_json=data.config_json,
        order_index=data.order_index,
        is_required=data.is_required
    )
    db.add(property)
    db.commit()
    db.refresh(property)
    return property


@router.patch("/properties/{property_id}", response_model=TaskPropertyResponse)
def update_task_property(
    property_id: int,
    data: TaskPropertyUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role([ROLE_ADMIN, ROLE_PROJECT_MANAGER]))],
):
    """Atualiza uma propriedade (apenas admin/gerente)."""
    property = db.query(TaskProperty).filter(TaskProperty.id == property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Propriedade não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(property, key, value)
    
    db.commit()
    db.refresh(property)
    return property


# ============== Task Views ==============

@router.get("/databases/{database_id}/views", response_model=List[TaskViewResponse])
def list_task_views(
    database_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista views do usuário atual para uma base de tarefas."""
    views = db.query(TaskView).filter(
        TaskView.task_database_id == database_id,
        TaskView.user_id == current_user.id
    ).order_by(TaskView.is_default.desc(), TaskView.name).all()
    return views


@router.get("/views/{view_id}", response_model=TaskViewResponse)
def get_task_view(
    view_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Obtém uma view específica."""
    view = db.query(TaskView).filter(
        TaskView.id == view_id,
        TaskView.user_id == current_user.id
    ).first()
    if not view:
        raise HTTPException(status_code=404, detail="View não encontrada")
    return view


@router.post("/views", response_model=TaskViewResponse, status_code=status.HTTP_201_CREATED)
def create_task_view(
    data: TaskViewCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria uma nova view para o usuário atual."""
    # Verificar se database existe
    database = db.query(TaskDatabase).filter(TaskDatabase.id == data.task_database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Base de tarefas não encontrada")
    
    # Se marcar como default, desmarcar outros do mesmo tipo
    if data.is_default:
        db.query(TaskView).filter(
            TaskView.task_database_id == data.task_database_id,
            TaskView.user_id == current_user.id,
            TaskView.type == data.type
        ).update({"is_default": False})
    
    view = TaskView(
        task_database_id=data.task_database_id,
        user_id=current_user.id,
        name=data.name,
        type=data.type,
        config_json=data.config_json,
        is_default=data.is_default
    )
    db.add(view)
    db.commit()
    db.refresh(view)
    return view


@router.patch("/views/{view_id}", response_model=TaskViewResponse)
def update_task_view(
    view_id: int,
    data: TaskViewUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Atualiza uma view do usuário atual."""
    view = db.query(TaskView).filter(
        TaskView.id == view_id,
        TaskView.user_id == current_user.id
    ).first()
    if not view:
        raise HTTPException(status_code=404, detail="View não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Se marcar como default, desmarcar outros do mesmo tipo
    if update_data.get("is_default") is True:
        db.query(TaskView).filter(
            TaskView.task_database_id == view.task_database_id,
            TaskView.user_id == current_user.id,
            TaskView.type == view.type,
            TaskView.id != view_id
        ).update({"is_default": False})
    
    for key, value in update_data.items():
        setattr(view, key, value)
    
    db.commit()
    db.refresh(view)
    return view


@router.delete("/views/{view_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_view(
    view_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Exclui uma view do usuário atual."""
    view = db.query(TaskView).filter(
        TaskView.id == view_id,
        TaskView.user_id == current_user.id
    ).first()
    if not view:
        raise HTTPException(status_code=404, detail="View não encontrada")
    
    db.delete(view)
    db.commit()


# ============== Task Property Values ==============

@router.post("/property-values", response_model=TaskPropertyValueResponse, status_code=status.HTTP_201_CREATED)
def create_task_property_value(
    data: TaskPropertyValueCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria ou atualiza valor de propriedade para uma tarefa."""
    # Verificar se task e property existem
    task = db.query(Tarefa).filter(Tarefa.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    property = db.query(TaskProperty).filter(TaskProperty.id == data.property_id).first()
    if not property:
        raise HTTPException(status_code=404, detail="Propriedade não encontrada")
    
    # Verificar se já existe
    existing = db.query(TaskPropertyValue).filter(
        TaskPropertyValue.task_id == data.task_id,
        TaskPropertyValue.property_id == data.property_id
    ).first()
    
    if existing:
        existing.value_json = data.value_json
        db.commit()
        db.refresh(existing)
        return existing
    else:
        value = TaskPropertyValue(
            task_id=data.task_id,
            property_id=data.property_id,
            value_json=data.value_json
        )
        db.add(value)
        db.commit()
        db.refresh(value)
        return value


@router.patch("/property-values/{value_id}", response_model=TaskPropertyValueResponse)
def update_task_property_value(
    value_id: int,
    data: TaskPropertyValueUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Atualiza valor de propriedade."""
    value = db.query(TaskPropertyValue).filter(TaskPropertyValue.id == value_id).first()
    if not value:
        raise HTTPException(status_code=404, detail="Valor de propriedade não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(value, key, val)
    
    db.commit()
    db.refresh(value)
    return value


# ============== Task Blocks ==============

@router.get("/tasks/{task_id}/blocks", response_model=List[TaskBlockResponse])
def list_task_blocks(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista blocos de uma tarefa."""
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    blocks = db.query(TaskBlock).filter(
        TaskBlock.task_id == task_id
    ).order_by(TaskBlock.order_index).all()
    return blocks


@router.post("/blocks", response_model=TaskBlockResponse, status_code=status.HTTP_201_CREATED)
def create_task_block(
    data: TaskBlockCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria um novo bloco em uma tarefa."""
    task = db.query(Tarefa).filter(Tarefa.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    block = TaskBlock(
        task_id=data.task_id,
        type=data.type,
        content_json=data.content_json,
        order_index=data.order_index
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.put("/tasks/{task_id}/blocks", response_model=List[TaskBlockResponse])
def bulk_update_task_blocks(
    task_id: int,
    blocks: List[Dict[str, Any]],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Atualiza blocos em bulk (reordenar/salvar)."""
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    # Deletar blocos existentes e recriar
    db.query(TaskBlock).filter(TaskBlock.task_id == task_id).delete()
    
    new_blocks = []
    for idx, block_data in enumerate(blocks):
        block = TaskBlock(
            task_id=task_id,
            type=block_data.get("type", "PARAGRAPH"),
            content_json=block_data.get("content_json"),
            order_index=block_data.get("order_index", idx)
        )
        db.add(block)
        new_blocks.append(block)
    
    db.commit()
    for block in new_blocks:
        db.refresh(block)
    
    return new_blocks


@router.patch("/blocks/{block_id}", response_model=TaskBlockResponse)
def update_task_block(
    block_id: int,
    data: TaskBlockUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Atualiza um bloco."""
    block = db.query(TaskBlock).filter(TaskBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Bloco não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(block, key, value)
    
    db.commit()
    db.refresh(block)
    return block


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_block(
    block_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Exclui um bloco."""
    block = db.query(TaskBlock).filter(TaskBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Bloco não encontrado")
    
    db.delete(block)
    db.commit()


# ============== Task Comments ==============

@router.get("/tasks/{task_id}/comments", response_model=List[TaskCommentResponse])
def list_task_comments(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista comentários de uma tarefa."""
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    comments = db.query(TaskComment).options(
        joinedload(TaskComment.author)
    ).filter(TaskComment.task_id == task_id).order_by(TaskComment.created_at).all()
    
    return [
        TaskCommentResponse(
            id=c.id,
            task_id=c.task_id,
            content=c.content,
            author_user_id=c.author_user_id,
            author_nome=c.author.nome if c.author else None,
            created_at=c.created_at
        )
        for c in comments
    ]


@router.post("/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
def create_task_comment(
    data: TaskCommentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria um comentário em uma tarefa."""
    task = db.query(Tarefa).filter(Tarefa.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    comment = TaskComment(
        task_id=data.task_id,
        author_user_id=current_user.id,
        content=data.content
    )
    db.add(comment)
    db.flush()
    
    # Criar menções se houver
    for mentioned_user_id in data.mentioned_user_ids:
        mention = TaskMention(
            task_id=data.task_id,
            mentioned_user_id=mentioned_user_id,
            comment_id=comment.id
        )
        db.add(mention)
    
    db.commit()
    db.refresh(comment)
    
    return TaskCommentResponse(
        id=comment.id,
        task_id=comment.task_id,
        content=comment.content,
        author_user_id=comment.author_user_id,
        author_nome=current_user.nome,
        created_at=comment.created_at
    )


# ============== Task Attachments ==============

@router.get("/tasks/{task_id}/attachments", response_model=List[TaskAttachmentResponse])
def list_task_attachments(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista anexos de uma tarefa."""
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    attachments = db.query(TaskAttachment).options(
        joinedload(TaskAttachment.uploaded_by)
    ).filter(TaskAttachment.task_id == task_id).order_by(TaskAttachment.created_at.desc()).all()
    
    return [
        TaskAttachmentResponse(
            id=a.id,
            task_id=a.task_id,
            file_name=a.file_name,
            mime_type=a.mime_type,
            size_bytes=a.size_bytes,
            storage_key=a.storage_key,
            url=a.url,
            uploaded_by_user_id=a.uploaded_by_user_id,
            uploaded_by_nome=a.uploaded_by.nome if a.uploaded_by else None,
            created_at=a.created_at
        )
        for a in attachments
    ]


@router.post("/tasks/{task_id}/attachments", response_model=TaskAttachmentResponse, status_code=status.HTTP_201_CREATED)
def upload_task_attachment(
    task_id: int,
    file: Annotated[UploadFile, File()],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Faz upload de um anexo para uma tarefa."""
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    
    # Validar tamanho (máximo 10MB)
    MAX_SIZE = 10 * 1024 * 1024
    content = file.file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 10MB.")
    
    # Tentar usar storage service (S3/MinIO) se disponível
    storage_key = None
    url = None
    
    try:
        from app.core.storage import get_storage_service
        storage = get_storage_service()
        if storage.is_configured():
            filename = storage.generate_unique_filename(file.filename or "file")
            folder = f"tasks/{task_id}"
            url = storage.upload_file(
                file_content=content,
                folder=folder,
                filename=filename,
                content_type=file.content_type or "application/octet-stream"
            )
            storage_key = f"{folder}/{filename}"
            logger.info(f"[UPLOAD] Arquivo enviado para S3: {url}")
        else:
            # Fallback: salvar localmente (não recomendado para produção)
            import os
            from pathlib import Path
            upload_dir = Path("uploads/tasks") / str(task_id)
            upload_dir.mkdir(parents=True, exist_ok=True)
            file_path = upload_dir / (file.filename or "file")
            with open(file_path, "wb") as f:
                f.write(content)
            url = f"/uploads/tasks/{task_id}/{file.filename}"
            storage_key = str(file_path)
            logger.info(f"[UPLOAD] Arquivo salvo localmente: {file_path}")
    except Exception as e:
        logger.error(f"[UPLOAD] Erro ao fazer upload: {e}")
        # Continuar mesmo se upload falhar (salvar metadados)
    
    attachment = TaskAttachment(
        task_id=task_id,
        uploaded_by_user_id=current_user.id,
        file_name=file.filename or "arquivo",
        mime_type=file.content_type,
        size_bytes=len(content),
        storage_key=storage_key,
        url=url
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    return TaskAttachmentResponse(
        id=attachment.id,
        task_id=attachment.task_id,
        file_name=attachment.file_name,
        mime_type=attachment.mime_type,
        size_bytes=attachment.size_bytes,
        storage_key=attachment.storage_key,
        url=attachment.url,
        uploaded_by_user_id=attachment.uploaded_by_user_id,
        uploaded_by_nome=current_user.nome,
        created_at=attachment.created_at
    )


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_attachment(
    attachment_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Exclui um anexo."""
    attachment = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    
    # TODO: Deletar arquivo do storage se necessário
    
    db.delete(attachment)
    db.commit()


# ============== Task Templates ==============

@router.get("/databases/{database_id}/templates", response_model=List[TaskTemplateResponse])
def list_task_templates(
    database_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista templates de uma base de tarefas."""
    templates = db.query(TaskTemplate).filter(
        TaskTemplate.task_database_id == database_id
    ).order_by(TaskTemplate.name).all()
    return templates


@router.post("/templates", response_model=TaskTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_task_template(
    data: TaskTemplateCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role([ROLE_ADMIN, ROLE_PROJECT_MANAGER]))],
):
    """Cria um template de tarefa (apenas admin/gerente)."""
    database = db.query(TaskDatabase).filter(TaskDatabase.id == data.task_database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Base de tarefas não encontrada")
    
    template = TaskTemplate(
        task_database_id=data.task_database_id,
        name=data.name,
        description=data.description,
        default_blocks_json=data.default_blocks_json,
        default_property_values_json=data.default_property_values_json,
        created_by_user_id=current_user.id
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.patch("/templates/{template_id}", response_model=TaskTemplateResponse)
def update_task_template(
    template_id: int,
    data: TaskTemplateUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(require_any_role([ROLE_ADMIN, ROLE_PROJECT_MANAGER]))],
):
    """Atualiza um template (apenas admin/gerente)."""
    template = db.query(TaskTemplate).filter(TaskTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
    
    db.commit()
    db.refresh(template)
    return template

