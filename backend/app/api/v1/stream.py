from typing import Annotated
import asyncio
import json
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.usuario import Usuario
from app.services.notificacao_service import get_unread_count

router = APIRouter(prefix="/stream", tags=["stream"])


async def event_generator(user_id: uuid.UUID):
    """Gera eventos SSE para notificações em tempo real."""
    from app.core.database import SessionLocal
    
    last_count = 0
    db = SessionLocal()
    try:
        last_count = get_unread_count(db, user_id)
    finally:
        db.close()
    
    while True:
        try:
            # Criar nova sessão para cada verificação
            db = SessionLocal()
            try:
                current_count = get_unread_count(db, user_id)
                
                if current_count != last_count:
                    event_data = {
                        "type": "notification",
                        "unread_count": current_count,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"
                    last_count = current_count
            finally:
                db.close()
            
            # Heartbeat a cada 30 segundos
            await asyncio.sleep(30)
            yield f": heartbeat\n\n"
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            error_data = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
            await asyncio.sleep(5)


@router.get("/notifications")
async def stream_notifications(
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """SSE endpoint para notificações em tempo real."""
    return StreamingResponse(
        event_generator(current_user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

