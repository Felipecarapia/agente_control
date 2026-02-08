from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response
from app.core.validators import PaginationValidator
# Removida restrição de permissão - qualquer usuário autenticado pode enviar DM
from app.models.usuario import Usuario
from app.schemas.mensagem import (
    ConversationCreate, MessageCreate, ConversationResponse,
    ConversationListResponse, MessageResponse
)
from app.services.mensagem_service import (
    get_or_create_direct_conversation, send_direct_message,
    get_user_conversations, get_conversation_with_messages,
)

router = APIRouter(prefix="/conversations", tags=["mensagens"])


@router.post("/direct", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_direct_conversation(
    data: ConversationCreate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],  # Removida restrição - qualquer um pode enviar DM
):
    """Cria ou obtém conversa direta e envia primeira mensagem."""
    try:
        conversation = get_or_create_direct_conversation(
            db=db,
            user1_id=current_user.id,
            user2_id=data.recipient_user_id,
            creator_id=current_user.id,
        )

        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        message = send_direct_message(
            db=db,
            conversation_id=conversation.id,
            author_user_id=current_user.id,
            content=data.first_message,
            request_ip=ip_address,
            user_agent=user_agent,
        )

        return {
            "conversation_id": str(conversation.id),
            "message_id": str(message.id),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=dict)
def list_conversations(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lista conversas do usuário."""
    result = get_user_conversations(
        db=db,
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )

    # Formatar resposta
    items = []
    for conv in result["items"]:
        # Buscar outro participante
        other_participant = None
        for p in conv.participants:
            if p.user_id != current_user.id:
                other_participant = p
                break

        # Buscar última mensagem
        last_message = None
        if conv.messages:
            last_msg = conv.messages[-1]
            last_message = {
                "id": str(last_msg.id),
                "content": last_msg.content,
                "author_user_id": last_msg.author_user_id,
                "created_at": last_msg.created_at,
                "author_name": last_msg.author.nome if last_msg.author else None,
            }

        # Contar não lidas
        unread_count = 0
        for p in conv.participants:
            if p.user_id == current_user.id and p.last_read_at:
                # Contar mensagens após last_read_at
                unread_count = len([
                    m for m in conv.messages
                    if m.created_at > p.last_read_at
                ])
                break

        items.append({
            "id": str(conv.id),
            "kind": conv.kind,
            "created_at": conv.created_at,
            "other_participant_name": other_participant.user.nome if other_participant else None,
            "other_participant_id": other_participant.user_id if other_participant else None,
            "last_message": last_message,
            "unread_count": unread_count,
        })

    return {
        "items": items,
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
    }


@router.get("/{conversation_id}", response_model=dict)
def get_conversation(
    conversation_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    limit: int = Query(50, ge=1, le=100),
):
    """Obtém conversa com mensagens."""
    try:
        result = get_conversation_with_messages(
            db=db,
            conversation_id=conversation_id,
            user_id=current_user.id,
            limit=limit,
        )

        # Formatar participantes
        participants = []
        for p in result["conversation"].participants:
            participants.append({
                "id": p.id,
                "user_id": p.user_id,
                "user_name": p.user.nome if p.user else None,
                "last_read_at": p.last_read_at,
            })

        # Formatar mensagens
        messages = []
        for m in result["messages"]:
            messages.append({
                "id": str(m.id),
                "conversation_id": str(m.conversation_id),
                "author_user_id": m.author_user_id,
                "content": m.content,
                "created_at": m.created_at,
                "edited_at": m.edited_at,
                "author_name": m.author.nome if m.author else None,
            })

        return {
            "id": str(result["conversation"].id),
            "kind": result["conversation"].kind,
            "created_at": result["conversation"].created_at,
            "participants": participants,
            "messages": messages,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{conversation_id}/messages", response_model=dict, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: UUID,
    data: MessageCreate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Envia mensagem em uma conversa."""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    try:
        message = send_direct_message(
            db=db,
            conversation_id=conversation_id,
            author_user_id=current_user.id,
            content=data.content,
            request_ip=ip_address,
            user_agent=user_agent,
        )

        return {
            "id": str(message.id),
            "conversation_id": str(conversation_id),
            "content": message.content,
            "author_user_id": message.author_user_id,
            "created_at": message.created_at,
            "author_name": message.author.nome if message.author else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_conversation_read(
    conversation_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Marca conversa como lida."""
    from app.models.mensagem import ConversationParticipant
    from datetime import datetime

    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id,
    ).first()

    if not participant:
        raise HTTPException(status_code=404, detail="Conversa não encontrada")

    participant.last_read_at = datetime.utcnow()
    db.commit()

