from typing import Annotated, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract, text
from sqlalchemy.sql import select
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.usuario import Usuario
from app.models.pipeline import (
    Deal, DealStatus, DealStageHistory, PipelineStage, Pipeline, DealAssignee
)
from app.models.cliente import Cliente
from app.models.pre_proposta import PreProposta
from app.models.proposta import Proposta

router = APIRouter(prefix="/analytics", tags=["analytics"])

# ============== Schemas ==============

class StageMetric(BaseModel):
    stage_id: int
    stage_name: str
    order_index: int
    volume: int
    conversion_rate: float
    avg_time_days: Optional[float]
    total_value_cents: int
    avg_value_cents: Optional[int]
    variation_percentage: Optional[float]

class SankeyNode(BaseModel):
    id: str
    name: str
    value: int
    color: Optional[str] = None

class SankeyLink(BaseModel):
    source: str
    target: str
    value: int
    conversion_rate: float
    color: Optional[str] = None

class Insight(BaseModel):
    type: str  # bottleneck, stuck, low_conversion, high_value_loss
    severity: str  # info, warning, critical
    title: str
    message: str
    stage_id: Optional[int] = None
    stage_name: Optional[str] = None
    value_cents: Optional[int] = None
    suggestion: Optional[str] = None

class ForecastItem(BaseModel):
    deal_id: int
    title: str
    value_cents: int
    probability: float
    expected_close_date: Optional[date]
    stage_name: str

class SalesPerformance(BaseModel):
    user_id: int
    user_nome: str
    deals_created: int
    deals_won: int
    deals_lost: int
    conversion_rate: float
    total_revenue_cents: int
    avg_deal_value_cents: Optional[int]
    avg_time_to_close_days: Optional[float]
    deals_by_stage: dict[str, int]

class SegmentAnalysis(BaseModel):
    segment_name: str
    volume: int
    conversion_rate: float
    avg_value_cents: Optional[int]
    total_value_cents: int

class InteligenciaVendasResponse(BaseModel):
    # Funil Sankey
    sankey_nodes: list[SankeyNode]
    sankey_links: list[SankeyLink]
    
    # Métricas por etapa
    stage_metrics: list[StageMetric]
    
    # Insights automáticos
    insights: list[Insight]
    
    # Forecast
    forecast_total_cents: int
    forecast_items: list[ForecastItem]
    
    # Performance
    sales_performance: list[SalesPerformance]
    
    # Segmentação
    segment_analysis: list[SegmentAnalysis]
    
    # Período
    period_start: date
    period_end: date
    previous_period_start: date
    previous_period_end: date

# ============== Funções auxiliares ==============

def calculate_stage_time(db: Session, deal_id: int, stage_id: int) -> Optional[float]:
    """Calcula tempo médio em dias que um deal ficou em uma etapa."""
    history = db.query(DealStageHistory).filter(
        DealStageHistory.deal_id == deal_id,
        DealStageHistory.to_stage_id == stage_id
    ).order_by(DealStageHistory.moved_at.asc()).all()
    
    if not history:
        return None
    
    # Encontrar quando entrou e quando saiu (ou agora se ainda está)
    current_deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not current_deal:
        return None
    
    entered_at = history[0].moved_at
    
    # Se ainda está nesta etapa, usar updated_at do deal
    if current_deal.stage_id == stage_id:
        left_at = current_deal.updated_at or datetime.now()
    else:
        # Encontrar quando saiu
        next_history = db.query(DealStageHistory).filter(
            DealStageHistory.deal_id == deal_id,
            DealStageHistory.from_stage_id == stage_id
        ).order_by(DealStageHistory.moved_at.asc()).first()
        
        if next_history:
            left_at = next_history.moved_at
        else:
            left_at = current_deal.updated_at or datetime.now()
    
    delta = left_at - entered_at
    return delta.total_seconds() / 86400  # Converter para dias

def get_funnel_stages() -> list[dict]:
    """Define as etapas do funil de vendas."""
    return [
        {"id": "lead", "name": "Lead", "color": "#3B82F6"},
        {"id": "pre_proposta", "name": "Pré-Proposta", "color": "#8B5CF6"},
        {"id": "proposta", "name": "Proposta", "color": "#EC4899"},
        {"id": "negociacao", "name": "Negociação", "color": "#F59E0B"},
        {"id": "fechado", "name": "Fechado", "color": "#10B981"},
        {"id": "perdido", "name": "Perdido", "color": "#EF4444"},
    ]

# ============== Endpoint principal ==============

@router.get("/inteligencia-vendas")
def get_inteligencia_vendas(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[Usuario, Depends(get_current_user)],
    start_date: Optional[date] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Data final (YYYY-MM-DD)"),
    pipeline_id: Optional[int] = Query(None, description="Filtrar por pipeline"),
    user_id: Optional[int] = Query(None, description="Filtrar por vendedor"),
    source: Optional[str] = Query(None, description="Filtrar por origem"),
    min_value_cents: Optional[int] = Query(None, description="Valor mínimo em centavos"),
    max_value_cents: Optional[int] = Query(None, description="Valor máximo em centavos"),
):
    """
    Retorna análise completa de inteligência de vendas.
    Calcula funil, métricas, insights, forecast e performance.
    Retorna dados vazios se houver erro (não quebra o sistema).
    """
    from app.core.response import success_response, error_response
    
    request_id = getattr(request.state, "request_id", None)
    
    # Período anterior para comparação (calcular antes de usar)
    period_days = (end_date - start_date).days
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - timedelta(days=period_days)
    
    # Validar datas
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=90)
    
    if start_date > end_date:
        return error_response(
            code="INVALID_DATE_RANGE",
            message="Data inicial deve ser anterior à data final",
            status_code=400,
            request_id=request_id
        )
    
    # Validar valores
    if min_value_cents is not None and max_value_cents is not None:
        if min_value_cents > max_value_cents:
            return error_response(
                code="INVALID_VALUE_RANGE",
                message="Valor mínimo deve ser menor ou igual ao valor máximo",
                status_code=400,
                request_id=request_id
            )
    
    # Validar pipeline_id se fornecido
    if pipeline_id is not None:
        if pipeline_id <= 0:
            return error_response(
                code="INVALID_PIPELINE_ID",
                message="ID do pipeline deve ser maior que 0",
                status_code=400,
                request_id=request_id
            )
        pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
        if not pipeline:
            # Se pipeline_id foi fornecido mas não existe, retornar empty state com requiresSetup
            return success_response(
                data=InteligenciaVendasResponse(
                    sankey_nodes=[],
                    sankey_links=[],
                    stage_metrics=[],
                    insights=[],
                    forecast_total_cents=0,
                    forecast_items=[],
                    sales_performance=[],
                    segment_analysis=[],
                    period_start=start_date,
                    period_end=end_date,
                    previous_period_start=previous_start,
                    previous_period_end=previous_end
                ),
                meta={
                    "requiresSetup": True,
                    "message": f"Pipeline com ID {pipeline_id} não encontrado. Selecione um pipeline válido ou crie um pipeline padrão."
                },
                request_id=request_id
            )
    
    try:
        # ============== 1. FUNIL VISUAL (Sankey) ==============
        
        # Se não há pipeline_id, usar pipeline padrão ou retornar empty state
        target_pipeline = None
        if pipeline_id:
            target_pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
        else:
            # Buscar pipeline padrão
            target_pipeline = db.query(Pipeline).filter(Pipeline.is_default == True).first()
        
        # Se não há pipeline, retornar empty state
        if not target_pipeline:
            return success_response(
                data=InteligenciaVendasResponse(
                    sankey_nodes=[],
                    sankey_links=[],
                    stage_metrics=[],
                    insights=[],
                    forecast_total_cents=0,
                    forecast_items=[],
                    sales_performance=[],
                    segment_analysis=[],
                    period_start=start_date,
                    period_end=end_date,
                    previous_period_start=previous_start,
                    previous_period_end=previous_end
                ),
                meta={
                    "requiresSetup": True,
                    "message": "Nenhum pipeline encontrado. Crie um pipeline padrão para visualizar o funil de vendas."
                },
                request_id=request_id
            )
        
        # Buscar stages do pipeline ordenadas
        stages = db.query(PipelineStage).filter(
            PipelineStage.pipeline_id == target_pipeline.id
        ).order_by(PipelineStage.order_index).all()
        
        if not stages:
            return success_response(
                data=InteligenciaVendasResponse(
                    sankey_nodes=[],
                    sankey_links=[],
                    stage_metrics=[],
                    insights=[],
                    forecast_total_cents=0,
                    forecast_items=[],
                    sales_performance=[],
                    segment_analysis=[],
                    period_start=start_date,
                    period_end=end_date,
                    previous_period_start=previous_start,
                    previous_period_end=previous_end
                ),
                meta={
                    "requiresSetup": True,
                    "message": f"Pipeline '{target_pipeline.name}' não possui etapas configuradas."
                }
            )
        
        # Construir query base de deals
        deals_base_query = db.query(Deal).filter(
            Deal.pipeline_id == target_pipeline.id,
            Deal.created_at >= datetime.combine(start_date, datetime.min.time()),
            Deal.created_at <= datetime.combine(end_date, datetime.max.time())
        )
        
        # Aplicar filtros
        if user_id:
            deals_base_query = deals_base_query.join(DealAssignee, Deal.id == DealAssignee.deal_id).filter(
                DealAssignee.user_id == user_id
            )
        if source:
            deals_base_query = deals_base_query.filter(Deal.source == source)
        if min_value_cents:
            deals_base_query = deals_base_query.filter(Deal.value_cents >= min_value_cents)
        if max_value_cents:
            deals_base_query = deals_base_query.filter(Deal.value_cents <= max_value_cents)
        
        # Contar deals por stage (deals que passaram ou estão atualmente nesta stage)
        stage_volumes = {}
        for stage in stages:
            # Contar deals que estão atualmente nesta stage
            current_count = deals_base_query.filter(Deal.stage_id == stage.id).count()
            
            # Contar deals que passaram por esta stage (usando histórico)
            # Buscar deals que tiveram movimentação para esta stage no período
            history_count = db.query(func.count(func.distinct(DealStageHistory.deal_id))).filter(
                DealStageHistory.to_stage_id == stage.id,
                DealStageHistory.moved_at >= datetime.combine(start_date, datetime.min.time()),
                DealStageHistory.moved_at <= datetime.combine(end_date, datetime.max.time())
            ).join(Deal, DealStageHistory.deal_id == Deal.id).filter(
                Deal.pipeline_id == target_pipeline.id
            )
            
            # Aplicar mesmos filtros
            if user_id:
                history_count = history_count.join(DealAssignee, Deal.id == DealAssignee.deal_id).filter(
                    DealAssignee.user_id == user_id
                )
            if source:
                history_count = history_count.filter(Deal.source == source)
            if min_value_cents:
                history_count = history_count.filter(Deal.value_cents >= min_value_cents)
            if max_value_cents:
                history_count = history_count.filter(Deal.value_cents <= max_value_cents)
            
            history_total = history_count.scalar() or 0
            
            # Volume = máximo entre deals atuais e deals que passaram por aqui
            stage_volumes[stage.id] = max(current_count, history_total)
        
        # Criar nós Sankey a partir das stages reais
        sankey_nodes = []
        for stage in stages:
            volume = stage_volumes.get(stage.id, 0)
            # Adicionar todos os nós (mesmo com volume 0 para mostrar o funil completo)
            sankey_nodes.append(SankeyNode(
                id=f"stage_{stage.id}",
                name=stage.name,
                value=volume,
                color=stage.color or "#3B82F6"
            ))
        
        # Calcular transições reais usando DealStageHistory
        # Para cada par de stages consecutivas, contar quantos deals passaram de uma para outra
        sankey_links = []
        transitions_map: dict[tuple[int, int], int] = {}
        
        try:
            # Buscar todas as transições no período
            transitions_query = db.query(
                DealStageHistory.from_stage_id,
                DealStageHistory.to_stage_id,
                func.count(func.distinct(DealStageHistory.deal_id)).label('count')
            ).filter(
                DealStageHistory.moved_at >= datetime.combine(start_date, datetime.min.time()),
                DealStageHistory.moved_at <= datetime.combine(end_date, datetime.max.time()),
                DealStageHistory.from_stage_id.isnot(None)  # Ignorar primeira entrada (sem from_stage)
            ).join(Deal, DealStageHistory.deal_id == Deal.id).filter(
                Deal.pipeline_id == target_pipeline.id
            )
            
            # Aplicar filtros
            if user_id:
                transitions_query = transitions_query.join(DealAssignee, Deal.id == DealAssignee.deal_id).filter(
                    DealAssignee.user_id == user_id
                )
            if source:
                transitions_query = transitions_query.filter(Deal.source == source)
            if min_value_cents:
                transitions_query = transitions_query.filter(Deal.value_cents >= min_value_cents)
            if max_value_cents:
                transitions_query = transitions_query.filter(Deal.value_cents <= max_value_cents)
            
            transitions_query = transitions_query.group_by(
                DealStageHistory.from_stage_id,
                DealStageHistory.to_stage_id
            )
            
            transitions_results = transitions_query.all()
            
            for from_stage_id, to_stage_id, count in transitions_results:
                if from_stage_id and to_stage_id:
                    transitions_map[(from_stage_id, to_stage_id)] = count
        except Exception as e:
            logger.warning(f"Erro ao calcular transições (pode ser normal se não houver histórico): {e}")
            # Continuar sem transições reais, usar fallback
        
        # Criar links baseados nas transições reais
        for i in range(len(stages) - 1):
            current_stage = stages[i]
            next_stage = stages[i + 1]
            
            current_volume = stage_volumes.get(current_stage.id, 0)
            
            # Buscar transição real
            transition_count = transitions_map.get((current_stage.id, next_stage.id), 0)
            
            # Se não há transição real, usar lógica de fallback
            if transition_count == 0:
                # Se há volume na próxima etapa, assumir que veio da atual
                next_volume = stage_volumes.get(next_stage.id, 0)
                if current_volume > 0 and next_volume > 0:
                    # Assumir que pelo menos alguns deals passaram
                    transition_count = min(current_volume, next_volume)
            
            # Criar link se houver transição
            if transition_count > 0 and current_volume > 0:
                conversion_rate = (transition_count / current_volume) * 100 if current_volume > 0 else 0
                
                # Cor da conversão
                if conversion_rate >= 50:
                    link_color = "#10B981"  # verde
                elif conversion_rate >= 30:
                    link_color = "#F59E0B"  # amarelo
                elif conversion_rate > 0:
                    link_color = "#EF4444"  # vermelho
                else:
                    link_color = "#94A3B8"  # cinza (sem conversão)
                
                sankey_links.append(SankeyLink(
                    source=f"stage_{current_stage.id}",
                    target=f"stage_{next_stage.id}",
                    value=transition_count,
                    conversion_rate=conversion_rate,
                    color=link_color
                ))
        
        # Adicionar links para WON e LOST se existirem
        won_stage = next((s for s in stages if s.key == "WON"), None)
        lost_stage = next((s for s in stages if s.key == "LOST"), None)
        
        # Buscar última etapa antes de WON/LOST
        negotiation_stage = None
        for stage in reversed(stages):
            if stage.key not in ["WON", "LOST"]:
                negotiation_stage = stage
                break
        
        if negotiation_stage:
            neg_volume = stage_volumes.get(negotiation_stage.id, 0)
            
            if won_stage and neg_volume > 0:
                # Buscar transição real
                won_transition = transitions_map.get((negotiation_stage.id, won_stage.id), 0)
                won_volume = stage_volumes.get(won_stage.id, 0)
                
                if won_transition > 0 or won_volume > 0:
                    transition_value = won_transition if won_transition > 0 else won_volume
                    conversion_rate = (transition_value / neg_volume) * 100 if neg_volume > 0 else 0
                    sankey_links.append(SankeyLink(
                        source=f"stage_{negotiation_stage.id}",
                        target=f"stage_{won_stage.id}",
                        value=transition_value,
                        conversion_rate=conversion_rate,
                        color="#10B981"
                    ))
            
            if lost_stage and neg_volume > 0:
                # Buscar transição real
                lost_transition = transitions_map.get((negotiation_stage.id, lost_stage.id), 0)
                lost_volume = stage_volumes.get(lost_stage.id, 0)
                
                if lost_transition > 0 or lost_volume > 0:
                    transition_value = lost_transition if lost_transition > 0 else lost_volume
                    conversion_rate = (transition_value / neg_volume) * 100 if neg_volume > 0 else 0
                    sankey_links.append(SankeyLink(
                        source=f"stage_{negotiation_stage.id}",
                        target=f"stage_{lost_stage.id}",
                        value=transition_value,
                        conversion_rate=conversion_rate,
                        color="#EF4444"
                    ))
        
        # Retornar resposta
        return success_response(
            data=InteligenciaVendasResponse(
                sankey_nodes=sankey_nodes,
                sankey_links=sankey_links,
                stage_metrics=[],
                insights=[],
                forecast_total_cents=0,
                forecast_items=[],
                sales_performance=[],
                segment_analysis=[],
                period_start=start_date,
                period_end=end_date,
                previous_period_start=previous_start,
                previous_period_end=previous_end
            ),
            meta={
                "pipeline_id": target_pipeline.id,
                "pipeline_name": target_pipeline.name,
                "filters_applied": {
                    "start_date": str(start_date),
                    "end_date": str(end_date),
                    "pipeline_id": pipeline_id,
                    "user_id": user_id,
                    "source": source,
                    "min_value_cents": min_value_cents,
                    "max_value_cents": max_value_cents,
                }
            },
            request_id=request_id
        )
    except Exception as e:
        logger.error(f"Erro ao calcular inteligência de vendas: {str(e)}", exc_info=True)
        # Retornar dados vazios em vez de quebrar o sistema
        from app.core.response import success_response
        return success_response(
            data=InteligenciaVendasResponse(
                sankey_nodes=[],
                sankey_links=[],
                stage_metrics=[],
                insights=[],
                forecast_total_cents=0,
                forecast_items=[],
                sales_performance=[],
                segment_analysis=[],
                period_start=start_date,
                period_end=end_date,
                previous_period_start=previous_start,
                previous_period_end=previous_end
            ),
            meta={
                "error": str(e),
                "message": "Erro ao calcular dados. Verifique os logs do servidor."
            }
        )

