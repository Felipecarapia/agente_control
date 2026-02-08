from datetime import datetime
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.mensagem import (
    Conversation, ConversationParticipant, Message, MessageToNotificationLink,
    ConversationKind, AuditEvent
)
from app.models.notificacao import Notification, NotificationRecipient, NotificationType, NotificationPriority
from app.schemas.mensagem import MessageCreate, ConversationCreate


NUDGE_PRESETS = {
    "PENDING_CHECK": {
        "title": "Pendências no projeto",
        "body": "Verifique pendências em {project_name} na sua área.",
        "priority": NotificationPriority.NORMAL,
    },
    "URGENT_UPDATE": {
        "title": "Atualização urgente",
        "body": "Precisamos de uma atualização urgente sobre {project_name}.",
        "priority": NotificationPriority.URGENT,
    },
    "STATUS_TODAY": {
        "title": "Preciso de status hoje",
        "body": "Por favor, envie o status de {project_name} até o final do dia.",
        "priority": NotificationPriority.HIGH,
    },
}

TASK_NUDGE_PRESETS = {
    "PENDING_CHECK": {
        "title": "Pendências na tarefa",
        "body": "Verifique pendências em {task_name} na sua área.",
        "priority": NotificationPriority.NORMAL,
    },
    "URGENT_UPDATE": {
        "title": "Atualização urgente",
        "body": "Precisamos de uma atualização urgente sobre {task_name}.",
        "priority": NotificationPriority.URGENT,
    },
    "STATUS_TODAY": {
        "title": "Preciso de status hoje",
        "body": "Por favor, envie o status de {task_name} até o final do dia.",
        "priority": NotificationPriority.HIGH,
    },
}


def get_project_members(db: Session, project_id: int) -> list[dict]:
    """Lista usuários envolvidos no projeto (via tarefas e responsável)."""
    from app.models.projeto import Projeto
    from app.models.tarefa import Tarefa
    from app.models.usuario import Usuario

    project = db.query(Projeto).filter(Projeto.id == project_id).first()
    if not project:
        return []

    user_ids = set()

    # Gerente do projeto
    if project.usuario_id:
        user_ids.add(project.usuario_id)

    # Responsáveis de tarefas
    tasks = db.query(Tarefa).filter(Tarefa.projeto_id == project_id).all()
    for task in tasks:
        if task.responsavel_id:
            user_ids.add(task.responsavel_id)

    # Buscar dados dos usuários
    if not user_ids:
        # Se não houver membros, retornar lista vazia
        return []
    users = db.query(Usuario).filter(Usuario.id.in_(list(user_ids))).all()
    return [{"id": u.id, "nome": u.nome, "email": u.email} for u in users]


def send_project_nudge(
    db: Session,
    project_id: int,
    recipient_user_ids: list[int],
    preset: str = "PENDING_CHECK",
    custom_message: Optional[str] = None,
    author_user_id: int = None,
    request_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> list[Notification]:
    """Envia notificação de cobrança para membros do projeto."""
    from app.models.projeto import Projeto

    project = db.query(Projeto).filter(Projeto.id == project_id).first()
    if not project:
        raise ValueError("Projeto não encontrado")

    preset_data = NUDGE_PRESETS.get(preset, NUDGE_PRESETS["PENDING_CHECK"])
    body = custom_message or preset_data["body"].format(project_name=project.nome)

    notifications = []
    for user_id in recipient_user_ids:
        notification = Notification(
            type=NotificationType.PROJECT_NUDGE.value,
            title=preset_data["title"],
            body=body,
            priority=str(preset_data["priority"].value) if hasattr(preset_data["priority"], "value") else str(preset_data["priority"]),
            author_user_id=author_user_id,
            context_type="PROJECT",
            context_id=str(project_id),
            action_url=f"/dashboard/projetos/{project_id}",
            extra_data={"preset": preset, "project_name": project.nome},
        )
        db.add(notification)
        db.flush()

        recipient = NotificationRecipient(
            notification_id=notification.id,
            recipient_user_id=user_id,
        )
        db.add(recipient)

        # Audit
        if author_user_id:
            audit = AuditEvent(
                event_type="BULK_NUDGE",
                actor_user_id=author_user_id,
                target_user_id=user_id,
                context_type="PROJECT",
                context_id=str(project_id),
                payload=f'{{"notification_id": "{notification.id}", "preset": "{preset}"}}',
                ip_address=request_ip,
                user_agent=user_agent,
            )
            db.add(audit)

        notifications.append(notification)

    db.commit()
    return notifications


def get_task_members(db: Session, task_id: int) -> list[dict]:
    """Lista usuários envolvidos na tarefa (responsável + assignees)."""
    from app.models.tarefa import Tarefa, TarefaAssignee
    from app.models.usuario import Usuario

    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        return []

    user_ids = set()

    # Responsável da tarefa
    if task.responsavel_id:
        user_ids.add(task.responsavel_id)

    # Assignees da tarefa
    assignees = db.query(TarefaAssignee).filter(TarefaAssignee.tarefa_id == task_id).all()
    for assignee in assignees:
        user_ids.add(assignee.usuario_id)

    # Buscar dados dos usuários
    if not user_ids:
        return []
    users = db.query(Usuario).filter(Usuario.id.in_(list(user_ids))).all()
    return [{"id": u.id, "nome": u.nome, "email": u.email} for u in users]


def send_task_nudge(
    db: Session,
    task_id: int,
    recipient_user_ids: list[int],
    preset: str = "PENDING_CHECK",
    custom_message: Optional[str] = None,
    author_user_id: int = None,
    request_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> list[Notification]:
    """Envia notificação de cobrança para membros da tarefa."""
    from app.models.tarefa import Tarefa

    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise ValueError("Tarefa não encontrada")

    preset_data = TASK_NUDGE_PRESETS.get(preset, TASK_NUDGE_PRESETS["PENDING_CHECK"])
    body = custom_message or preset_data["body"].format(task_name=task.titulo)

    notifications = []
    for user_id in recipient_user_ids:
        notification = Notification(
            type=NotificationType.TASK_NUDGE.value,
            title=preset_data["title"],
            body=body,
            priority=str(preset_data["priority"].value) if hasattr(preset_data["priority"], "value") else str(preset_data["priority"]),
            author_user_id=author_user_id,
            context_type="TASK",
            context_id=str(task_id),
            action_url=f"/dashboard/tarefas?taskId={task_id}",
            extra_data={"preset": preset, "task_name": task.titulo},
        )
        db.add(notification)
        db.flush()

        recipient = NotificationRecipient(
            notification_id=notification.id,
            recipient_user_id=user_id,
        )
        db.add(recipient)

        # Audit
        if author_user_id:
            audit = AuditEvent(
                event_type="BULK_NUDGE",
                actor_user_id=author_user_id,
                target_user_id=user_id,
                context_type="TASK",
                context_id=str(task_id),
                payload=f'{{"notification_id": "{notification.id}", "preset": "{preset}"}}',
                ip_address=request_ip,
                user_agent=user_agent,
            )
            db.add(audit)

        notifications.append(notification)

    db.commit()
    return notifications


def get_or_create_direct_conversation(
    db: Session,
    user1_id: int,
    user2_id: int,
    creator_id: int,
) -> Conversation:
    """Obtém ou cria conversa direta entre dois usuários."""
    if user1_id == user2_id:
        raise ValueError("Não é possível criar conversa consigo mesmo")

    # Buscar conversa existente (que tenha exatamente os dois participantes)
    # Buscar conversas diretas onde o usuário participa
    user_conversations = db.query(Conversation).join(ConversationParticipant).filter(
        Conversation.kind == ConversationKind.DIRECT,
        ConversationParticipant.user_id == user1_id,
    ).all()
    
    # Verificar se alguma tem o outro usuário como participante
    for conv in user_conversations:
        # Recarregar participantes para garantir que temos todos
        db.refresh(conv, ["participants"])
        participant_ids = {p.user_id for p in conv.participants}
        if len(participant_ids) == 2 and participant_ids == {user1_id, user2_id}:
            return conv

    # Criar nova conversa
    conversation = Conversation(
        kind=ConversationKind.DIRECT,
        created_by_user_id=creator_id,
    )
    db.add(conversation)
    db.flush()

    # Adicionar participantes
    p1 = ConversationParticipant(conversation_id=conversation.id, user_id=user1_id)
    p2 = ConversationParticipant(conversation_id=conversation.id, user_id=user2_id)
    db.add(p1)
    db.add(p2)
    db.commit()
    db.refresh(conversation)

    return conversation


def send_direct_message(
    db: Session,
    conversation_id: UUID,
    author_user_id: int,
    content: str,
    request_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Message:
    """Envia mensagem em uma conversa."""
    # Verificar se usuário participa da conversa
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == author_user_id,
    ).first()
    if not participant:
        raise ValueError("Usuário não participa desta conversa")

    # Criar mensagem
    message = Message(
        conversation_id=conversation_id,
        author_user_id=author_user_id,
        content=content,
    )
    db.add(message)
    db.flush()

    # Buscar outros participantes
    other_participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id != author_user_id,
    ).all()

    # Criar notificações para outros participantes
    for participant in other_participants:
        notification = Notification(
            type=NotificationType.DIRECT_MESSAGE,
            title="Nova mensagem direta",
            body=content[:200] + ("..." if len(content) > 200 else ""),
            priority=NotificationPriority.NORMAL,
            author_user_id=author_user_id,
            context_type="CONVERSATION",
            context_id=str(conversation_id),
            action_url=f"/dashboard/mensagens/{conversation_id}",
            extra_data={"message_id": str(message.id)},
        )
        db.add(notification)
        db.flush()

        recipient = NotificationRecipient(
            notification_id=notification.id,
            recipient_user_id=participant.user_id,
        )
        db.add(recipient)

        # Link message to notification
        link = MessageToNotificationLink(
            message_id=message.id,
            recipient_user_id=participant.user_id,
            notification_recipient_id=recipient.id,
        )
        db.add(link)

        # Audit
        audit = AuditEvent(
            event_type="MESSAGE_SENT",
            actor_user_id=author_user_id,
            target_user_id=participant.user_id,
            context_type="CONVERSATION",
            context_id=str(conversation_id),
            payload=f'{{"message_id": "{message.id}"}}',
            ip_address=request_ip,
            user_agent=user_agent,
        )
        db.add(audit)

    db.commit()
    db.refresh(message)
    return message


def get_user_conversations(
    db: Session,
    user_id: int,
    page: int = 1,
    page_size: int = 20,
):
    """Lista conversas do usuário."""
    conversations = db.query(Conversation).join(ConversationParticipant).filter(
        ConversationParticipant.user_id == user_id,
    ).order_by(Conversation.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    total = db.query(Conversation).join(ConversationParticipant).filter(
        ConversationParticipant.user_id == user_id,
    ).count()

    return {
        "items": conversations,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_conversation_with_messages(
    db: Session,
    conversation_id: UUID,
    user_id: int,
    limit: int = 50,
):
    """Obtém conversa com mensagens."""
    # Verificar participação
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id,
    ).first()
    if not participant:
        raise ValueError("Usuário não participa desta conversa")

    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise ValueError("Conversa não encontrada")

    # Atualizar last_read_at
    participant.last_read_at = datetime.utcnow()
    db.commit()

    # Buscar mensagens
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id,
    ).order_by(Message.created_at.desc()).limit(limit).all()

    return {
        "conversation": conversation,
        "messages": list(reversed(messages)),  # Mais antigas primeiro
    }

