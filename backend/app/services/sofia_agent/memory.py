from typing import Any, Dict, List
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from sqlalchemy.orm import Session
from app.models.lead import LeadMessage, LeadMessageRole
import uuid

class PostgresChatMessageHistory(BaseChatMessageHistory):
    def __init__(self, session: Session, conversation_id: uuid.UUID, tenant_id: uuid.UUID, limit: int = 20):
        self.session = session
        self.conversation_id = conversation_id
        self.tenant_id = tenant_id
        self.limit = limit
        self.messages: List[BaseMessage] = []

    def load_messages(self):
        db_messages = (
            self.session.query(LeadMessage)
            .filter(LeadMessage.conversation_id == self.conversation_id)
            .order_by(LeadMessage.created_at.desc())
            .limit(self.limit)
            .all()
        )
        
        langchain_messages = []
        for msg in reversed(db_messages):
            if msg.role == LeadMessageRole.LEAD:
                langchain_messages.append(HumanMessage(content=msg.content))
            elif msg.role == LeadMessageRole.AGENT:
                langchain_messages.append(AIMessage(content=msg.content))
        
        self.messages = langchain_messages

    def add_messages(self, messages: List[BaseMessage]) -> None:
        """Adiciona mensagens ao histórico na memória apenas (whatsapp.py já salva no DB)."""
        for msg in messages:
            self.messages.append(msg)

    async def aadd_messages(self, messages: List[BaseMessage]) -> None:
        """Adiciona mensagens ao histórico (wrapper assíncrono)."""
        self.add_messages(messages)

    def add_message(self, message: BaseMessage) -> None:
        self.add_messages([message])

    def clear(self) -> None:
        self.messages = []
