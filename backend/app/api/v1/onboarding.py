from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.models.onboarding import (
    ClienteOnboarding,
    ClienteMetaWhatsapp,
    ClienteContatoOperacional,
)
from app.schemas.onboarding import (
    OnboardingCreate,
    OnboardingUpdate,
    OnboardingResponse,
    MetaWhatsappCreate,
    MetaWhatsappUpdate,
    MetaWhatsappResponse,
    ContatoOperacionalCreate,
    ContatoOperacionalUpdate,
    ContatoOperacionalResponse,
)

router = APIRouter(prefix="/clientes/{cliente_id}/onboarding", tags=["onboarding"])


# ─── helpers ────────────────────────────────────────────────────────

def _get_cliente(db: Session, cliente_id: int) -> Cliente:
    obj = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return obj


# ═══════════════════════════════════════════════════════════════════
# Onboarding (info landing page, materiais, resultado)
# ═══════════════════════════════════════════════════════════════════

@router.get("/info", response_model=OnboardingResponse | None)
def get_onboarding(
    cliente_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    obj = db.query(ClienteOnboarding).filter(ClienteOnboarding.cliente_id == cliente_id).first()
    return obj


@router.put("/info", response_model=OnboardingResponse)
def upsert_onboarding(
    cliente_id: int,
    data: OnboardingCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    obj = db.query(ClienteOnboarding).filter(ClienteOnboarding.cliente_id == cliente_id).first()
    if obj:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
    else:
        obj = ClienteOnboarding(cliente_id=cliente_id, **data.model_dump())
        db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ═══════════════════════════════════════════════════════════════════
# Meta WhatsApp Oficial
# ═══════════════════════════════════════════════════════════════════

@router.get("/whatsapp", response_model=MetaWhatsappResponse | None)
def get_whatsapp(
    cliente_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    obj = db.query(ClienteMetaWhatsapp).filter(ClienteMetaWhatsapp.cliente_id == cliente_id).first()
    return obj


@router.put("/whatsapp", response_model=MetaWhatsappResponse)
def upsert_whatsapp(
    cliente_id: int,
    data: MetaWhatsappCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    obj = db.query(ClienteMetaWhatsapp).filter(ClienteMetaWhatsapp.cliente_id == cliente_id).first()
    if obj:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
    else:
        obj = ClienteMetaWhatsapp(cliente_id=cliente_id, **data.model_dump())
        db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ═══════════════════════════════════════════════════════════════════
# Contatos Operacionais (CRUD completo)
# ═══════════════════════════════════════════════════════════════════

@router.get("/contatos", response_model=list[ContatoOperacionalResponse])
def list_contatos(
    cliente_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    return db.query(ClienteContatoOperacional).filter(
        ClienteContatoOperacional.cliente_id == cliente_id
    ).order_by(ClienteContatoOperacional.id).all()


@router.post("/contatos", response_model=ContatoOperacionalResponse, status_code=status.HTTP_201_CREATED)
def create_contato(
    cliente_id: int,
    data: ContatoOperacionalCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    obj = ClienteContatoOperacional(cliente_id=cliente_id, **data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/contatos/{contato_id}", response_model=ContatoOperacionalResponse)
def update_contato(
    cliente_id: int,
    contato_id: int,
    data: ContatoOperacionalUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    obj = db.query(ClienteContatoOperacional).filter(
        ClienteContatoOperacional.id == contato_id,
        ClienteContatoOperacional.cliente_id == cliente_id,
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/contatos/{contato_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contato(
    cliente_id: int,
    contato_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    obj = db.query(ClienteContatoOperacional).filter(
        ClienteContatoOperacional.id == contato_id,
        ClienteContatoOperacional.cliente_id == cliente_id,
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    db.delete(obj)
    db.commit()
