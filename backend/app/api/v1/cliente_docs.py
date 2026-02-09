"""Endpoints para Documentos RAG, Imagens e Cronograma do cliente."""
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.storage import get_storage_service, StorageService
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.models.cliente_docs import (
    ClienteDocumentoRAG,
    ClienteImagem,
    ClienteCronogramaEtapa,
    ClienteCronogramaItem,
)
from app.schemas.cliente_docs import (
    DocumentoRAGResponse,
    ImagemResponse,
    ImagemUpdateDescricao,
    CronogramaEtapaCreate,
    CronogramaEtapaUpdate,
    CronogramaEtapaResponse,
    CronogramaItemCreate,
    CronogramaItemUpdate,
    CronogramaItemResponse,
    CronogramaToggleItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clientes/{cliente_id}", tags=["cliente-docs"])


def _get_cliente(db: Session, cliente_id: uuid.UUID) -> Cliente:
    obj = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return obj


# ═══════════════════════════════════════════════════════════════
# Documentos RAG
# ═══════════════════════════════════════════════════════════════

@router.get("/documentos-rag", response_model=list[DocumentoRAGResponse])
def list_documentos_rag(
    cliente_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    return db.query(ClienteDocumentoRAG).filter(
        ClienteDocumentoRAG.cliente_id == cliente_id
    ).order_by(ClienteDocumentoRAG.id.desc()).all()


@router.post("/documentos-rag/upload", response_model=DocumentoRAGResponse, status_code=status.HTTP_201_CREATED)
async def upload_documento_rag(
    cliente_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    _get_cliente(db, cliente_id)
    storage = get_storage_service()
    if not storage.is_configured():
        raise HTTPException(status_code=500, detail="Storage não configurado")

    content = await file.read()
    ext_allowed = {"pdf", "doc", "docx", "txt", "csv", "xlsx", "xls", "pptx", "md", "json"}
    unique_name = storage.generate_unique_filename(file.filename or "document.pdf", ext_allowed)
    folder = f"clientes/{cliente_id}/documentos-rag"

    logger.info(f"[DOC-RAG] Upload: {file.filename} -> {folder}/{unique_name} ({len(content)} bytes)")

    url = storage.upload_file(
        file_content=content,
        folder=folder,
        filename=unique_name,
        content_type=file.content_type or "application/octet-stream",
    )

    doc = ClienteDocumentoRAG(
        cliente_id=cliente_id,
        nome_original=file.filename or "document",
        nome_storage=unique_name,
        url=url,
        content_type=file.content_type,
        tamanho_bytes=len(content),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documentos-rag/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_documento_rag(
    cliente_id: uuid.UUID,
    doc_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    doc = db.query(ClienteDocumentoRAG).filter(
        ClienteDocumentoRAG.id == doc_id,
        ClienteDocumentoRAG.cliente_id == cliente_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    # Tenta remover do storage
    try:
        storage = get_storage_service()
        if storage.is_configured():
            storage.delete_file(doc.url)
    except Exception as e:
        logger.warning(f"[DOC-RAG] Erro ao remover do storage: {e}")

    db.delete(doc)
    db.commit()


# ═══════════════════════════════════════════════════════════════
# Imagens Gerais
# ═══════════════════════════════════════════════════════════════

@router.get("/imagens", response_model=list[ImagemResponse])
def list_imagens(
    cliente_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    return db.query(ClienteImagem).filter(
        ClienteImagem.cliente_id == cliente_id
    ).order_by(ClienteImagem.id.desc()).all()


@router.post("/imagens/upload", response_model=ImagemResponse, status_code=status.HTTP_201_CREATED)
async def upload_imagem(
    cliente_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    _get_cliente(db, cliente_id)
    storage = get_storage_service()
    if not storage.is_configured():
        raise HTTPException(status_code=500, detail="Storage não configurado")

    content = await file.read()
    ext_allowed = {"jpg", "jpeg", "png", "webp", "gif", "svg"}
    unique_name = storage.generate_unique_filename(file.filename or "image.jpg", ext_allowed)
    folder = f"clientes/{cliente_id}/imagens"

    logger.info(f"[IMG] Upload: {file.filename} -> {folder}/{unique_name} ({len(content)} bytes)")

    url = storage.upload_file(
        file_content=content,
        folder=folder,
        filename=unique_name,
        content_type=file.content_type or "image/jpeg",
    )

    img = ClienteImagem(
        cliente_id=cliente_id,
        nome_original=file.filename or "image",
        nome_storage=unique_name,
        url=url,
        content_type=file.content_type,
        tamanho_bytes=len(content),
    )
    db.add(img)
    db.commit()
    db.refresh(img)
    return img


@router.patch("/imagens/{img_id}", response_model=ImagemResponse)
def update_imagem_descricao(
    cliente_id: uuid.UUID,
    img_id: uuid.UUID,
    data: ImagemUpdateDescricao,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    img = db.query(ClienteImagem).filter(
        ClienteImagem.id == img_id,
        ClienteImagem.cliente_id == cliente_id,
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    img.descricao = data.descricao
    db.commit()
    db.refresh(img)
    return img


@router.delete("/imagens/{img_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_imagem(
    cliente_id: uuid.UUID,
    img_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    img = db.query(ClienteImagem).filter(
        ClienteImagem.id == img_id,
        ClienteImagem.cliente_id == cliente_id,
    ).first()
    if not img:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    try:
        storage = get_storage_service()
        if storage.is_configured():
            storage.delete_file(img.url)
    except Exception as e:
        logger.warning(f"[IMG] Erro ao remover do storage: {e}")

    db.delete(img)
    db.commit()


# ═══════════════════════════════════════════════════════════════
# Cronograma (Etapas + Itens)
# ═══════════════════════════════════════════════════════════════

@router.get("/cronograma", response_model=list[CronogramaEtapaResponse])
def list_cronograma(
    cliente_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    return db.query(ClienteCronogramaEtapa).filter(
        ClienteCronogramaEtapa.cliente_id == cliente_id
    ).order_by(ClienteCronogramaEtapa.ordem).all()


@router.post("/cronograma/inicializar", response_model=list[CronogramaEtapaResponse])
def inicializar_cronograma(
    cliente_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Inicializa o cronograma padrão com todas as etapas e itens de checklist."""
    _get_cliente(db, cliente_id)

    # Verifica se já tem etapas
    existing = db.query(ClienteCronogramaEtapa).filter(
        ClienteCronogramaEtapa.cliente_id == cliente_id
    ).count()
    if existing > 0:
        raise HTTPException(status_code=400, detail="Cronograma já inicializado")

    etapas_default = _get_default_cronograma()

    for etapa_data in etapas_default:
        etapa = ClienteCronogramaEtapa(
            cliente_id=cliente_id,
            ordem=etapa_data["ordem"],
            titulo=etapa_data["titulo"],
            descricao=etapa_data.get("descricao", ""),
            cor=etapa_data.get("cor", "blue"),
        )
        db.add(etapa)
        db.flush()

        for idx, item_data in enumerate(etapa_data.get("itens", [])):
            item = ClienteCronogramaItem(
                etapa_id=etapa.id,
                ordem=idx,
                texto=item_data["texto"],
                categoria=item_data.get("categoria", "ação"),
                concluido=False,
            )
            db.add(item)

    db.commit()

    return db.query(ClienteCronogramaEtapa).filter(
        ClienteCronogramaEtapa.cliente_id == cliente_id
    ).order_by(ClienteCronogramaEtapa.ordem).all()


@router.post("/cronograma/etapas", response_model=CronogramaEtapaResponse, status_code=status.HTTP_201_CREATED)
def create_etapa(
    cliente_id: uuid.UUID,
    data: CronogramaEtapaCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    etapa = ClienteCronogramaEtapa(
        cliente_id=cliente_id,
        titulo=data.titulo,
        descricao=data.descricao,
        cor=data.cor,
        ordem=data.ordem,
    )
    db.add(etapa)
    db.flush()

    for idx, item_data in enumerate(data.itens):
        item = ClienteCronogramaItem(
            etapa_id=etapa.id,
            ordem=idx,
            texto=item_data.texto,
            categoria=item_data.categoria,
            concluido=item_data.concluido,
        )
        db.add(item)

    db.commit()
    db.refresh(etapa)
    return etapa


@router.patch("/cronograma/etapas/{etapa_id}", response_model=CronogramaEtapaResponse)
def update_etapa(
    cliente_id: uuid.UUID,
    etapa_id: uuid.UUID,
    data: CronogramaEtapaUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    etapa = db.query(ClienteCronogramaEtapa).filter(
        ClienteCronogramaEtapa.id == etapa_id,
        ClienteCronogramaEtapa.cliente_id == cliente_id,
    ).first()
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(etapa, k, v)
    db.commit()
    db.refresh(etapa)
    return etapa


@router.delete("/cronograma/etapas/{etapa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_etapa(
    cliente_id: uuid.UUID,
    etapa_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    etapa = db.query(ClienteCronogramaEtapa).filter(
        ClienteCronogramaEtapa.id == etapa_id,
        ClienteCronogramaEtapa.cliente_id == cliente_id,
    ).first()
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    db.delete(etapa)
    db.commit()


# ─── Item toggles & CRUD ──────────────────────────────────

@router.patch("/cronograma/itens/{item_id}/toggle", response_model=CronogramaItemResponse)
def toggle_item(
    cliente_id: uuid.UUID,
    item_id: uuid.UUID,
    data: CronogramaToggleItem,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    """Toggle um item como concluído ou não."""
    _get_cliente(db, cliente_id)
    item = db.query(ClienteCronogramaItem).join(ClienteCronogramaEtapa).filter(
        ClienteCronogramaItem.id == item_id,
        ClienteCronogramaEtapa.cliente_id == cliente_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    item.concluido = data.concluido
    db.commit()
    db.refresh(item)
    return item


@router.post("/cronograma/etapas/{etapa_id}/itens", response_model=CronogramaItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    cliente_id: uuid.UUID,
    etapa_id: uuid.UUID,
    data: CronogramaItemCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    etapa = db.query(ClienteCronogramaEtapa).filter(
        ClienteCronogramaEtapa.id == etapa_id,
        ClienteCronogramaEtapa.cliente_id == cliente_id,
    ).first()
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    item = ClienteCronogramaItem(
        etapa_id=etapa_id,
        texto=data.texto,
        categoria=data.categoria,
        ordem=data.ordem,
        concluido=data.concluido,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/cronograma/itens/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    cliente_id: uuid.UUID,
    item_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
):
    _get_cliente(db, cliente_id)
    item = db.query(ClienteCronogramaItem).join(ClienteCronogramaEtapa).filter(
        ClienteCronogramaItem.id == item_id,
        ClienteCronogramaEtapa.cliente_id == cliente_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(item)
    db.commit()


# ═══════════════════════════════════════════════════════════════
# Cronograma padrão
# ═══════════════════════════════════════════════════════════════

def _get_default_cronograma() -> list[dict]:
    """Retorna o cronograma operacional padrão."""
    return [
        {
            "ordem": 0,
            "titulo": "Lista de Ordens (Prioridades Absolutas)",
            "descricao": "Prioridades que devem ser seguidas rigorosamente no início do projeto.",
            "cor": "red",
            "itens": [
                {"texto": "Entender a operação real da empresa", "categoria": "ação"},
                {"texto": "Definir claramente o objetivo do MVP do bot", "categoria": "decisão"},
                {"texto": "Levantar dados mínimos para o ERP", "categoria": "ação"},
                {"texto": "Definir o número oficial do WhatsApp", "categoria": "decisão"},
                {"texto": "Extrair conhecimento da equipe de vendas", "categoria": "ação"},
                {"texto": "Organizar dados para: ERP, Site institucional, Treinamento do bot", "categoria": "ação"},
                {"texto": "Fechar o escopo do MVP do agente de atendimento", "categoria": "decisão"},
            ],
        },
        {
            "ordem": 1,
            "titulo": "Etapa 1 — Alinhamento Operacional",
            "descricao": "Reunir equipe e entender a operação real da empresa.",
            "cor": "orange",
            "itens": [
                {"texto": "Reunir decisor, equipe de vendas e operação", "categoria": "ação"},
                {"texto": "Levantar: O que a empresa vende hoje", "categoria": "ação"},
                {"texto": "Levantar: Como o cliente entra em contato", "categoria": "ação"},
                {"texto": "Levantar: Onde ocorrem os principais gargalos", "categoria": "ação"},
                {"texto": "Definir se o bot será: Atendimento, Vendas ou Ambos", "categoria": "decisão"},
                {"texto": "Definir o que o ERP controla no MVP: Clientes, Atendimentos, Pedidos", "categoria": "decisão"},
                {"texto": "Objetivo único do MVP definido", "categoria": "resultado"},
            ],
        },
        {
            "ordem": 2,
            "titulo": "Etapa 2 — Levantamento de Requisitos Essenciais (ERP)",
            "descricao": "Definir dados mínimos que o ERP precisa gerenciar.",
            "cor": "amber",
            "itens": [
                {"texto": "Dados de clientes: Nome, Telefone, Tipo (novo/recorrente), Observações", "categoria": "ação"},
                {"texto": "Dados de produtos/serviços: Nome, Descrição, Preço/faixa, Restrições", "categoria": "ação"},
                {"texto": "Dados de atendimento: Motivo do contato, Status, Responsável", "categoria": "ação"},
                {"texto": "Lista mínima de campos do ERP para o MVP definida", "categoria": "resultado"},
            ],
        },
        {
            "ordem": 3,
            "titulo": "Etapa 3 — Levantamento para Site Institucional",
            "descricao": "Coletar conteúdo base para o site e para o bot.",
            "cor": "green",
            "itens": [
                {"texto": "Coletar: Quem somos (linguagem real da empresa)", "categoria": "ação"},
                {"texto": "Coletar: O que vendemos", "categoria": "ação"},
                {"texto": "Coletar: Para quem vendemos", "categoria": "ação"},
                {"texto": "Coletar: Diferenciais reais", "categoria": "ação"},
                {"texto": "Coletar: Perguntas frequentes", "categoria": "ação"},
                {"texto": "Materiais: Logo coletado", "categoria": "ação"},
                {"texto": "Materiais: Fotos reais coletadas", "categoria": "ação"},
                {"texto": "Materiais: Redes sociais mapeadas", "categoria": "ação"},
                {"texto": "Conteúdo base do site pronto", "categoria": "resultado"},
                {"texto": "Conteúdo reutilizável para o bot pronto", "categoria": "resultado"},
            ],
        },
        {
            "ordem": 4,
            "titulo": "Etapa 4 — WhatsApp / Canal Oficial",
            "descricao": "Configurar e validar o canal oficial de comunicação.",
            "cor": "emerald",
            "itens": [
                {"texto": "Confirmar número oficial", "categoria": "ação"},
                {"texto": "Verificar WhatsApp Business", "categoria": "ação"},
                {"texto": "Analisar histórico de conversas", "categoria": "ação"},
                {"texto": "Identificar padrões de mensagens", "categoria": "ação"},
                {"texto": "Definir: Atendimento automático ou híbrido", "categoria": "decisão"},
                {"texto": "Definir: Horário de atuação do bot", "categoria": "decisão"},
                {"texto": "Definir: Critérios para entrada do atendimento humano", "categoria": "decisão"},
                {"texto": "Número validado", "categoria": "resultado"},
                {"texto": "Regras iniciais do chatbot definidas", "categoria": "resultado"},
            ],
        },
        {
            "ordem": 5,
            "titulo": "Etapa 5 — Extração de Conhecimento da Equipe de Vendas",
            "descricao": "Capturar a linguagem real de vendas para treinar o bot.",
            "cor": "blue",
            "itens": [
                {"texto": "Registrar: Como inicia a conversa com o cliente", "categoria": "ação"},
                {"texto": "Registrar: Como apresenta produtos", "categoria": "ação"},
                {"texto": "Registrar: Principais objeções", "categoria": "ação"},
                {"texto": "Registrar: Argumentos que fecham vendas", "categoria": "ação"},
                {"texto": "Registrar: Situações de perda de venda", "categoria": "ação"},
                {"texto": "Coletar mensagens reais copiadas", "categoria": "ação"},
                {"texto": "Coletar áudios reais", "categoria": "ação"},
                {"texto": "Coletar prints de conversas", "categoria": "ação"},
                {"texto": "Linguagem real de vendas extraída", "categoria": "resultado"},
                {"texto": "Base prática para treinamento do bot pronta", "categoria": "resultado"},
            ],
        },
        {
            "ordem": 6,
            "titulo": "Etapa 6 — Organização para Treinamento do Bot",
            "descricao": "Classificar e organizar todo material para o agente.",
            "cor": "purple",
            "itens": [
                {"texto": "Classificar: Perguntas frequentes", "categoria": "ação"},
                {"texto": "Classificar: Respostas padrão", "categoria": "ação"},
                {"texto": "Classificar: Objeções", "categoria": "ação"},
                {"texto": "Classificar: Encaminhamentos para atendimento humano", "categoria": "ação"},
                {"texto": "Definir: O que o bot responde sozinho", "categoria": "decisão"},
                {"texto": "Definir: O que o bot apenas encaminha", "categoria": "decisão"},
                {"texto": "Definir: O que o bot não responde", "categoria": "decisão"},
                {"texto": "Escopo fechado do MVP do agente de atendimento", "categoria": "resultado"},
            ],
        },
        {
            "ordem": 7,
            "titulo": "Etapa 7 — Priorização do ERP (MVP)",
            "descricao": "Definir o backlog inicial do ERP, sem excessos.",
            "cor": "cyan",
            "itens": [
                {"texto": "Cadastro de clientes", "categoria": "ação"},
                {"texto": "Histórico de atendimentos", "categoria": "ação"},
                {"texto": "Registro de pedidos simples", "categoria": "ação"},
                {"texto": "Log de conversas do WhatsApp", "categoria": "ação"},
                {"texto": "Fora do escopo: Financeiro avançado", "categoria": "decisão"},
                {"texto": "Fora do escopo: Relatórios complexos", "categoria": "decisão"},
                {"texto": "Fora do escopo: Automações pesadas", "categoria": "decisão"},
                {"texto": "Backlog inicial do ERP (MVP) definido", "categoria": "resultado"},
            ],
        },
        {
            "ordem": 8,
            "titulo": "Etapa 8 — Fechamento do Dia",
            "descricao": "Revisão final e validação com o decisor.",
            "cor": "slate",
            "itens": [
                {"texto": "Revisar tudo que foi levantado", "categoria": "ação"},
                {"texto": "Validar informações com o decisor", "categoria": "ação"},
                {"texto": "Definir próximos passos", "categoria": "decisão"},
                {"texto": "Direção clara para continuação do projeto", "categoria": "resultado"},
                {"texto": "Nenhuma pendência crítica", "categoria": "resultado"},
            ],
        },
    ]
