from fastapi import APIRouter, Depends, Request
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.response import success_response, error_response
from app.core.database import get_db

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
def health_check(
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Health check endpoint que testa a conexão com o banco de dados.
    Retorna { ok: true, data: { db: true } } se tudo estiver OK.
    Se DB falhar, retorna { ok: false, error: { code: "DB_DOWN", ... } }
    """
    request_id = getattr(request.state, "request_id", None) if request else None
    
    try:
        # Testar conexão com o banco de verdade
        db.execute(text("SELECT 1"))
        db.commit()
        
        return success_response(
            data={
                "status": "ok",
                "db": True,
                "timestamp": datetime.now().isoformat(),
                "service": "Sistemaxi CRM API"
            },
            request_id=request_id
        )
    except Exception as e:
        # Se o banco estiver offline, retornar erro mas com status 200 para não quebrar health checks
        return error_response(
            code="DB_DOWN",
            message=f"Banco de dados offline: {str(e)}",
            status_code=200,  # Status 200 para health checks não quebrarem
            details={"error_type": type(e).__name__, "error_message": str(e)},
            request_id=request_id
        )

