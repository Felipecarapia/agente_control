import uuid
import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.response import success_response, error_response, serialize_data
from app.models.whatsapp import WhatsAppConnection
from app.models.usuario import Usuario
from app.schemas.whatsapp import (
    WhatsAppConnectionCreate,
    WhatsAppConnectionUpdate,
    WhatsAppConnectionResponse,
)
from app.services.evolution_api import EvolutionAPIService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


# ──────────────────── CRUD ────────────────────

@router.get("/connections")
def list_connections(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Lista todas as conexões WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        connections = db.query(WhatsAppConnection).order_by(WhatsAppConnection.created_at.desc()).all()
        data = [serialize_data(c) for c in connections]
        return success_response(data=data, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao listar conexões WhatsApp: {e}", exc_info=True)
        return success_response(data=[], request_id=request_id)


@router.post("/connections", status_code=status.HTTP_201_CREATED)
def create_connection(
    request: Request,
    data: WhatsAppConnectionCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Cria uma nova conexão WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = WhatsAppConnection(
            **data.model_dump(),
            created_by_user_id=current_user.id,
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id, status_code=201)
    except Exception as e:
        logger.error(f"Erro ao criar conexão WhatsApp: {e}", exc_info=True)
        db.rollback()
        return error_response(
            code="CREATE_ERROR",
            message=f"Erro ao criar conexão: {str(e)}",
            status_code=500,
            request_id=request_id,
        )


@router.get("/connections/{connection_id}")
def get_connection(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Busca uma conexão pelo ID."""
    request_id = getattr(request.state, "request_id", None)
    obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
    if not obj:
        return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)
    return success_response(data=serialize_data(obj), request_id=request_id)


@router.put("/connections/{connection_id}")
def update_connection(
    request: Request,
    connection_id: uuid.UUID,
    data: WhatsAppConnectionUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Atualiza uma conexão WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)
        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return success_response(data=serialize_data(obj), request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao atualizar conexão WhatsApp: {e}", exc_info=True)
        db.rollback()
        return error_response(code="UPDATE_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.delete("/connections/{connection_id}")
def delete_connection(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Deleta uma conexão WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)
        db.delete(obj)
        db.commit()
        return success_response(data={"deleted": True}, request_id=request_id)
    except Exception as e:
        logger.error(f"Erro ao deletar conexão WhatsApp: {e}", exc_info=True)
        db.rollback()
        return error_response(code="DELETE_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Ações (Connect / Status / Disconnect) ────────────────────

@router.post("/connections/{connection_id}/connect")
async def connect_instance(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Inicia conexão com a instância WhatsApp — retorna QR Code."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)

        if obj.provider == "evolution":
            svc = EvolutionAPIService(api_url=obj.api_url, api_key=obj.api_key)
            instance_name = obj.instance_name or f"crm_{obj.id.hex[:8]}"

            # Cria instância se necessário
            try:
                await svc.create_instance(instance_name, obj.phone_number)
            except Exception:
                pass  # instância pode já existir

            # Configura webhook se houver
            if obj.webhook_url:
                try:
                    await svc.set_webhook(instance_name, obj.webhook_url)
                except Exception as wh_err:
                    logger.warning(f"Falha ao configurar webhook: {wh_err}")

            # Obtém QR Code
            qr_data = await svc.get_qrcode(instance_name)

            obj.instance_name = instance_name
            obj.status = "connecting"
            db.commit()
            db.refresh(obj)

            return success_response(
                data={
                    "qr_code": qr_data.get("base64") or qr_data.get("qrcode", {}).get("base64"),
                    "status": "connecting",
                    "instance_name": instance_name,
                },
                request_id=request_id,
            )
        else:
            # API Oficial — não usa QR code; conexão configurada via Meta Business
            obj.status = "connected"
            db.commit()
            return success_response(
                data={"status": "connected", "message": "API Oficial conectada via configuração Meta Business."},
                request_id=request_id,
            )

    except Exception as e:
        logger.error(f"Erro ao conectar instância WhatsApp: {e}", exc_info=True)
        return error_response(code="CONNECT_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.get("/connections/{connection_id}/status")
async def connection_status(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Verifica status em tempo real da conexão WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)

        if obj.provider == "evolution" and obj.instance_name:
            svc = EvolutionAPIService(api_url=obj.api_url, api_key=obj.api_key)
            status_data = await svc.get_connection_status(obj.instance_name)
            state = status_data.get("state") or status_data.get("instance", {}).get("state", "unknown")

            status_map = {"open": "connected", "close": "disconnected", "connecting": "connecting"}
            new_status = status_map.get(state, obj.status)
            if new_status != obj.status:
                obj.status = new_status
                db.commit()

            return success_response(
                data={"id": str(obj.id), "status": new_status, "instance_name": obj.instance_name, "phone_number": obj.phone_number},
                request_id=request_id,
            )
        else:
            return success_response(
                data={"id": str(obj.id), "status": obj.status, "phone_number": obj.phone_number},
                request_id=request_id,
            )

    except Exception as e:
        logger.error(f"Erro ao verificar status: {e}", exc_info=True)
        return error_response(code="STATUS_ERROR", message=str(e), status_code=500, request_id=request_id)


@router.post("/connections/{connection_id}/disconnect")
async def disconnect_instance(
    request: Request,
    connection_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Desconecta a instância WhatsApp."""
    request_id = getattr(request.state, "request_id", None)
    try:
        obj = db.query(WhatsAppConnection).filter(WhatsAppConnection.id == connection_id).first()
        if not obj:
            return error_response(code="NOT_FOUND", message="Conexão não encontrada", status_code=404, request_id=request_id)

        if obj.provider == "evolution" and obj.instance_name:
            svc = EvolutionAPIService(api_url=obj.api_url, api_key=obj.api_key)
            await svc.disconnect_instance(obj.instance_name)

        obj.status = "disconnected"
        db.commit()
        return success_response(data={"status": "disconnected"}, request_id=request_id)

    except Exception as e:
        logger.error(f"Erro ao desconectar: {e}", exc_info=True)
        return error_response(code="DISCONNECT_ERROR", message=str(e), status_code=500, request_id=request_id)


# ──────────────────── Webhook ────────────────────

@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    """Recebe eventos do webhook da Evolution API ou API Oficial."""
    try:
        body = await request.json()
        event = body.get("event", "")
        instance = body.get("instance", "")

        logger.info(f"Webhook WhatsApp recebido: event={event}, instance={instance}")

        if event == "connection.update":
            state = body.get("data", {}).get("state", "")
            if instance:
                conn = db.query(WhatsAppConnection).filter(WhatsAppConnection.instance_name == instance).first()
                if conn:
                    status_map = {"open": "connected", "close": "disconnected", "connecting": "connecting"}
                    conn.status = status_map.get(state, conn.status)
                    db.commit()

        elif event == "messages.upsert":
            # TODO: Processar mensagem recebida com agente de IA
            message_data = body.get("data", {})
            logger.info(f"Mensagem recebida na instância {instance}: {message_data.get('key', {}).get('remoteJid', '')}")

        return success_response(data={"received": True})

    except Exception as e:
        logger.error(f"Erro no webhook WhatsApp: {e}", exc_info=True)
        return success_response(data={"received": True})  # Sempre 200 para o webhook
