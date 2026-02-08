"""
Versão limpa e funcional do analytics.py
Reescrevendo get_inteligencia_vendas de forma completa e correta
"""
from typing import Annotated, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.usuario import Usuario
from app.models.pipeline import (
    Deal, DealStatus, DealStageHistory, PipelineStage, Pipeline, DealAssignee
)
from app.models.cliente import Cliente
from app.models.pre_proposta import PreProposta
from app.models.proposta import Proposta

# Importar schemas do arquivo original
from app.api.v1.analytics import (
    StageMetric, SankeyNode, SankeyLink, Insight, ForecastItem,
    SalesPerformance, SegmentAnalysis, InteligenciaVendasResponse,
    calculate_stage_time, get_funnel_stages
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/inteligencia-vendas", response_model=InteligenciaVendasResponse)
def get_inteligencia_vendas(
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
    """
    # Definir período padrão (últimos 90 dias)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=90)
    
    # Período anterior para comparação
    period_days = (end_date - start_date).days
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - timedelta(days=period_days)
    
    # ============== 1. FUNIL VISUAL (Sankey) ==============
    
    # Contar leads (clientes criados no período)
    leads_query = db.query(func.count(Cliente.id)).filter(
        Cliente.created_at >= datetime.combine(start_date, datetime.min.time()),
        Cliente.created_at <= datetime.combine(end_date, datetime.max.time())
    )
    total_leads = leads_query.scalar() or 0
    
    # Contar pré-propostas
    pre_propostas_query = db.query(func.count(PreProposta.id)).filter(
        PreProposta.created_at >= datetime.combine(start_date, datetime.min.time()),
        PreProposta.created_at <= datetime.combine(end_date, datetime.max.time())
    )
    total_pre_propostas = pre_propostas_query.scalar() or 0
    
    # Contar propostas
    propostas_query = db.query(func.count(Proposta.id)).filter(
        Proposta.created_at >= datetime.combine(start_date, datetime.min.time()),
        Proposta.created_at <= datetime.combine(end_date, datetime.max.time())
    )
    if pipeline_id:
        # Proposta pode ter deal_id, mas nem todas têm - usar outerjoin
        propostas_query = propostas_query.outerjoin(
            Deal, Proposta.deal_id == Deal.id
        ).filter(
            or_(
                Deal.pipeline_id == pipeline_id,
                Proposta.deal_id.is_(None)
            )
        )
    total_propostas = propostas_query.scalar() or 0
    
    # Contar deals em negociação (status OPEN)
    deals_query = db.query(Deal).filter(
        Deal.status == DealStatus.OPEN,
        Deal.created_at >= datetime.combine(start_date, datetime.min.time()),
        Deal.created_at <= datetime.combine(end_date, datetime.max.time())
    )
    if pipeline_id:
        deals_query = deals_query.filter(Deal.pipeline_id == pipeline_id)
    if user_id:
        deals_query = deals_query.join(DealAssignee, Deal.id == DealAssignee.deal_id).filter(
            DealAssignee.user_id == user_id
        )
    if source:
        deals_query = deals_query.filter(Deal.source == source)
    if min_value_cents:
        deals_query = deals_query.filter(Deal.value_cents >= min_value_cents)
    if max_value_cents:
        deals_query = deals_query.filter(Deal.value_cents <= max_value_cents)
    
    total_negociacao = deals_query.count()
    
    # Contar deals fechados (WON)
    deals_won_query = db.query(Deal).filter(
        Deal.status == DealStatus.WON,
        Deal.updated_at >= datetime.combine(start_date, datetime.min.time()),
        Deal.updated_at <= datetime.combine(end_date, datetime.max.time())
    )
    if pipeline_id:
        deals_won_query = deals_won_query.filter(Deal.pipeline_id == pipeline_id)
    if user_id:
        deals_won_query = deals_won_query.join(DealAssignee, Deal.id == DealAssignee.deal_id).filter(
            DealAssignee.user_id == user_id
        )
    if source:
        deals_won_query = deals_won_query.filter(Deal.source == source)
    if min_value_cents:
        deals_won_query = deals_won_query.filter(Deal.value_cents >= min_value_cents)
    if max_value_cents:
        deals_won_query = deals_won_query.filter(Deal.value_cents <= max_value_cents)
    
    total_fechado = deals_won_query.count()
    
    # Contar deals perdidos (LOST)
    deals_lost_query = db.query(Deal).filter(
        Deal.status == DealStatus.LOST,
        Deal.updated_at >= datetime.combine(start_date, datetime.min.time()),
        Deal.updated_at <= datetime.combine(end_date, datetime.max.time())
    )
    if pipeline_id:
        deals_lost_query = deals_lost_query.filter(Deal.pipeline_id == pipeline_id)
    if user_id:
        deals_lost_query = deals_lost_query.join(DealAssignee, Deal.id == DealAssignee.deal_id).filter(
            DealAssignee.user_id == user_id
        )
    if source:
        deals_lost_query = deals_lost_query.filter(Deal.source == source)
    if min_value_cents:
        deals_lost_query = deals_lost_query.filter(Deal.value_cents >= min_value_cents)
    if max_value_cents:
        deals_lost_query = deals_lost_query.filter(Deal.value_cents <= max_value_cents)
    
    total_perdido = deals_lost_query.count()
    
    # Criar nós Sankey
    funnel_stages = get_funnel_stages()
    sankey_nodes = []
    sankey_links = []
    
    volumes = {
        "lead": total_leads,
        "pre_proposta": total_pre_propostas,
        "proposta": total_propostas,
        "negociacao": total_negociacao,
        "fechado": total_fechado,
        "perdido": total_perdido,
    }
    
    for stage in funnel_stages:
        stage_id = stage["id"]
        volume = volumes.get(stage_id, 0)
        sankey_nodes.append(SankeyNode(
            id=stage_id,
            name=stage["name"],
            value=volume,
            color=stage["color"]
        ))
    
    # Criar links (transições)
    transitions = [
        ("lead", "pre_proposta", total_pre_propostas, total_leads),
        ("pre_proposta", "proposta", total_propostas, total_pre_propostas),
        ("proposta", "negociacao", total_negociacao, total_propostas),
        ("negociacao", "fechado", total_fechado, total_negociacao),
        ("negociacao", "perdido", total_perdido, total_negociacao),
    ]
    
    for source_id, target_id, value, source_volume in transitions:
        if source_volume > 0:
            conversion_rate = (value / source_volume) * 100
            # Determinar cor baseada na taxa de conversão
            if conversion_rate >= 50:
                color = "#10B981"  # verde
            elif conversion_rate >= 30:
                color = "#F59E0B"  # amarelo
            else:
                color = "#EF4444"  # vermelho
            
            sankey_links.append(SankeyLink(
                source=source_id,
                target=target_id,
                value=value,
                conversion_rate=conversion_rate,
                color=color
            ))
    
    # ============== 2. MÉTRICAS POR ETAPA ==============
    
    stage_metrics = []
    
    # Buscar todas as stages do pipeline (ou default)
    if pipeline_id:
        stages = db.query(PipelineStage).filter(
            PipelineStage.pipeline_id == pipeline_id
        ).order_by(PipelineStage.order_index).all()
    else:
        # Buscar pipeline padrão
        default_pipeline = db.query(Pipeline).filter(Pipeline.is_default == True).first()
        if default_pipeline:
            stages = db.query(PipelineStage).filter(
                PipelineStage.pipeline_id == default_pipeline.id
            ).order_by(PipelineStage.order_index).all()
        else:
            stages = []
    
    for stage in stages:
        # Volume atual
        stage_deals_query = db.query(Deal).filter(Deal.stage_id == stage.id)
        if user_id:
            stage_deals_query = stage_deals_query.join(
                DealAssignee, Deal.id == DealAssignee.deal_id
            ).filter(DealAssignee.user_id == user_id)
        if source:
            stage_deals_query = stage_deals_query.filter(Deal.source == source)
        if min_value_cents:
            stage_deals_query = stage_deals_query.filter(Deal.value_cents >= min_value_cents)
        if max_value_cents:
            stage_deals_query = stage_deals_query.filter(Deal.value_cents <= max_value_cents)
        
        volume = stage_deals_query.filter(
            Deal.created_at >= datetime.combine(start_date, datetime.min.time()),
            Deal.created_at <= datetime.combine(end_date, datetime.max.time())
        ).count()
        
        # Volume período anterior
        prev_volume = stage_deals_query.filter(
            Deal.created_at >= datetime.combine(previous_start, datetime.min.time()),
            Deal.created_at <= datetime.combine(previous_end, datetime.max.time())
        ).count()
        
        # Variação
        variation = None
        if prev_volume > 0:
            variation = ((volume - prev_volume) / prev_volume) * 100
        elif volume > 0 and prev_volume == 0:
            variation = 100.0  # Novo
        elif volume == 0 and prev_volume > 0:
            variation = -100.0  # Perdido
        
        # Taxa de conversão (deals que avançaram)
        next_stages = db.query(PipelineStage).filter(
            PipelineStage.pipeline_id == stage.pipeline_id,
            PipelineStage.order_index > stage.order_index
        ).order_by(PipelineStage.order_index).all()
        
        conversion_rate = 0.0
        if next_stages:
            # Contar deals que saíram desta etapa
            deals_that_left = db.query(func.count(DealStageHistory.id)).filter(
                DealStageHistory.from_stage_id == stage.id,
                DealStageHistory.moved_at >= datetime.combine(start_date, datetime.min.time()),
                DealStageHistory.moved_at <= datetime.combine(end_date, datetime.max.time())
            ).scalar() or 0
            
            if volume > 0:
                conversion_rate = (deals_that_left / volume) * 100
        
        # Tempo médio
        avg_time = None
        stage_deals = stage_deals_query.filter(
            Deal.stage_id == stage.id
        ).all()
        
        if stage_deals:
            times = []
            for deal in stage_deals:
                time = calculate_stage_time(db, deal.id, stage.id)
                if time:
                    times.append(time)
            if times:
                avg_time = sum(times) / len(times)
        
        # Valor total e médio
        total_value = db.query(func.coalesce(func.sum(Deal.value_cents), 0)).filter(
            Deal.stage_id == stage.id,
            Deal.created_at >= datetime.combine(start_date, datetime.min.time()),
            Deal.created_at <= datetime.combine(end_date, datetime.max.time())
        ).scalar() or 0
        
        avg_value = None
        if volume > 0:
            avg_value = int(total_value / volume)
        
        stage_metrics.append(StageMetric(
            stage_id=stage.id,
            stage_name=stage.name,
            order_index=stage.order_index,
            volume=volume,
            conversion_rate=conversion_rate,
            avg_time_days=avg_time,
            total_value_cents=int(total_value),
            avg_value_cents=avg_value,
            variation_percentage=variation
        ))
    
    # ============== 3. INSIGHTS AUTOMÁTICOS ==============
    
    insights = []
    
    # Detectar gargalos (queda > 20% na conversão)
    for i, metric in enumerate(stage_metrics):
        if metric.variation_percentage and metric.variation_percentage < -20:
            insights.append(Insight(
                type="bottleneck",
                severity="critical",
                title=f"Gargalo detectado em {metric.stage_name}",
                message=f"Volume caiu {abs(metric.variation_percentage):.1f}% em relação ao período anterior",
                stage_id=metric.stage_id,
                stage_name=metric.stage_name,
                suggestion="Analise os motivos da queda e considere ajustar a estratégia nesta etapa"
            ))
        
        # Tempo excessivo (> 30 dias)
        if metric.avg_time_days and metric.avg_time_days > 30:
            insights.append(Insight(
                type="stuck",
                severity="warning",
                title=f"Tempo excessivo em {metric.stage_name}",
                message=f"Tempo médio de {metric.avg_time_days:.1f} dias nesta etapa",
                stage_id=metric.stage_id,
                stage_name=metric.stage_name,
                suggestion="Follow-up em 48h aumenta conversão histórica em 17%"
            ))
        
        # Baixa conversão (< 30%)
        if metric.conversion_rate < 30 and metric.volume > 0:
            insights.append(Insight(
                type="low_conversion",
                severity="warning",
                title=f"Baixa conversão em {metric.stage_name}",
                message=f"Taxa de conversão de apenas {metric.conversion_rate:.1f}%",
                stage_id=metric.stage_id,
                stage_name=metric.stage_name,
                suggestion="Revise o processo e identifique pontos de melhoria"
            ))
    
    # Detectar leads parados (sem avanço há mais de 7 dias)
    stuck_deals_query = db.query(Deal).filter(
        Deal.status == DealStatus.OPEN,
        Deal.updated_at < datetime.now() - timedelta(days=7)
    )
    if pipeline_id:
        stuck_deals_query = stuck_deals_query.filter(Deal.pipeline_id == pipeline_id)
    if user_id:
        stuck_deals_query = stuck_deals_query.join(
            DealAssignee, Deal.id == DealAssignee.deal_id
        ).filter(DealAssignee.user_id == user_id)
    
    stuck_count = stuck_deals_query.count()
    if stuck_count > 0:
        stuck_deal_ids = [d.id for d in stuck_deals_query.limit(100).all()]
        if stuck_deal_ids:
            stuck_value = db.query(func.coalesce(func.sum(Deal.value_cents), 0)).filter(
                Deal.id.in_(stuck_deal_ids)
            ).scalar() or 0
        else:
            stuck_value = 0
        
        insights.append(Insight(
            type="stuck",
            severity="info",
            title=f"{stuck_count} leads parados",
            message=f"R$ {stuck_value / 100:.2f} travados sem avanço há mais de 7 dias",
            suggestion="Sugestão: follow-up em 48h aumenta conversão histórica em 17%"
        ))
    
    # ============== 4. FORECAST ==============
    
    # Deals abertos com probabilidade
    forecast_deals = db.query(Deal).filter(
        Deal.status == DealStatus.OPEN,
        Deal.probability > 0
    )
    if pipeline_id:
        forecast_deals = forecast_deals.filter(Deal.pipeline_id == pipeline_id)
    if user_id:
        forecast_deals = forecast_deals.join(
            DealAssignee, Deal.id == DealAssignee.deal_id
        ).filter(DealAssignee.user_id == user_id)
    
    forecast_items = []
    forecast_total = 0
    
    for deal in forecast_deals.all():
        # Calcular probabilidade ajustada
        # Base: probabilidade do deal
        # Ajuste: tempo na etapa atual (quanto mais tempo, menor a probabilidade)
        base_prob = deal.probability / 100.0
        
        stage_time = calculate_stage_time(db, deal.id, deal.stage_id)
        if stage_time and stage_time > 30:
            # Reduzir probabilidade se está parado
            time_factor = max(0.5, 1 - (stage_time - 30) / 100)
            adjusted_prob = base_prob * time_factor
        else:
            adjusted_prob = base_prob
        
        if deal.value_cents:
            expected_value = int(deal.value_cents * adjusted_prob)
            forecast_total += expected_value
            
            forecast_items.append(ForecastItem(
                deal_id=deal.id,
                title=deal.title,
                value_cents=deal.value_cents,
                probability=adjusted_prob * 100,
                expected_close_date=deal.expected_close_date,
                stage_name=deal.stage.name if deal.stage else "Desconhecido"
            ))
    
    # Ordenar por probabilidade
    forecast_items.sort(key=lambda x: x.probability, reverse=True)
    
    # ============== 5. PERFORMANCE POR VENDEDOR ==============
    
    sales_performance = []
    
    # Buscar todos os vendedores que criaram deals
    sellers = db.query(Usuario).join(Deal, Deal.created_by_user_id == Usuario.id).distinct().all()
    
    for seller in sellers:
        if user_id and seller.id != user_id:
            continue
        
        # Deals criados
        deals_created = db.query(func.count(Deal.id)).filter(
            Deal.created_by_user_id == seller.id,
            Deal.created_at >= datetime.combine(start_date, datetime.min.time()),
            Deal.created_at <= datetime.combine(end_date, datetime.max.time())
        )
        if pipeline_id:
            deals_created = deals_created.filter(Deal.pipeline_id == pipeline_id)
        deals_created_count = deals_created.scalar() or 0
        
        # Deals ganhos
        deals_won = db.query(func.count(Deal.id)).filter(
            Deal.created_by_user_id == seller.id,
            Deal.status == DealStatus.WON,
            Deal.updated_at >= datetime.combine(start_date, datetime.min.time()),
            Deal.updated_at <= datetime.combine(end_date, datetime.max.time())
        )
        if pipeline_id:
            deals_won = deals_won.filter(Deal.pipeline_id == pipeline_id)
        deals_won_count = deals_won.scalar() or 0
        
        # Deals perdidos
        deals_lost = db.query(func.count(Deal.id)).filter(
            Deal.created_by_user_id == seller.id,
            Deal.status == DealStatus.LOST,
            Deal.updated_at >= datetime.combine(start_date, datetime.min.time()),
            Deal.updated_at <= datetime.combine(end_date, datetime.max.time())
        )
        if pipeline_id:
            deals_lost = deals_lost.filter(Deal.pipeline_id == pipeline_id)
        deals_lost_count = deals_lost.scalar() or 0
        
        # Taxa de conversão
        conversion_rate = 0.0
        if deals_created_count > 0:
            conversion_rate = (deals_won_count / deals_created_count) * 100
        
        # Receita total
        revenue = db.query(func.coalesce(func.sum(Deal.value_cents), 0)).filter(
            Deal.created_by_user_id == seller.id,
            Deal.status == DealStatus.WON,
            Deal.updated_at >= datetime.combine(start_date, datetime.min.time()),
            Deal.updated_at <= datetime.combine(end_date, datetime.max.time())
        )
        if pipeline_id:
            revenue = revenue.filter(Deal.pipeline_id == pipeline_id)
        revenue_cents = revenue.scalar() or 0
        
        # Ticket médio
        avg_value = None
        if deals_won_count > 0:
            avg_value = int(revenue_cents / deals_won_count)
        
        # Tempo médio até fechar
        won_deals = db.query(Deal).filter(
            Deal.created_by_user_id == seller.id,
            Deal.status == DealStatus.WON,
            Deal.updated_at >= datetime.combine(start_date, datetime.min.time()),
            Deal.updated_at <= datetime.combine(end_date, datetime.max.time())
        )
        if pipeline_id:
            won_deals = won_deals.filter(Deal.pipeline_id == pipeline_id)
        
        avg_time = None
        times = []
        for deal in won_deals.all():
            if deal.created_at and deal.updated_at:
                delta = deal.updated_at - deal.created_at
                times.append(delta.total_seconds() / 86400)
        if times:
            avg_time = sum(times) / len(times)
        
        # Deals por etapa
        deals_by_stage = {}
        for stage in stages:
            count = db.query(func.count(Deal.id)).filter(
                Deal.created_by_user_id == seller.id,
                Deal.stage_id == stage.id
            ).scalar() or 0
            deals_by_stage[stage.name] = count
        
        sales_performance.append(SalesPerformance(
            user_id=seller.id,
            user_nome=seller.nome,
            deals_created=deals_created_count,
            deals_won=deals_won_count,
            deals_lost=deals_lost_count,
            conversion_rate=conversion_rate,
            total_revenue_cents=int(revenue_cents),
            avg_deal_value_cents=avg_value,
            avg_time_to_close_days=avg_time,
            deals_by_stage=deals_by_stage
        ))
    
    # Ordenar por receita
    sales_performance.sort(key=lambda x: x.total_revenue_cents, reverse=True)
    
    # ============== 6. SEGMENTAÇÃO ==============
    
    segment_analysis = []
    
    # Segmentar por origem (source)
    sources = db.query(Deal.source).distinct().filter(Deal.source.isnot(None)).all()
    for (source_val,) in sources:
        if source and source_val != source:
            continue
        
        source_deals = db.query(Deal).filter(Deal.source == source_val)
        if pipeline_id:
            source_deals = source_deals.filter(Deal.pipeline_id == pipeline_id)
        if user_id:
            source_deals = source_deals.join(
                DealAssignee, Deal.id == DealAssignee.deal_id
            ).filter(DealAssignee.user_id == user_id)
        
        volume = source_deals.filter(
            Deal.created_at >= datetime.combine(start_date, datetime.min.time()),
            Deal.created_at <= datetime.combine(end_date, datetime.max.time())
        ).count()
        
        won = source_deals.filter(Deal.status == DealStatus.WON).count()
        conversion = (won / volume * 100) if volume > 0 else 0.0
        
        total_value = db.query(func.coalesce(func.sum(Deal.value_cents), 0)).filter(
            Deal.source == source_val,
            Deal.status == DealStatus.WON
        ).scalar() or 0
        
        avg_value = int(total_value / won) if won > 0 else None
        
        segment_analysis.append(SegmentAnalysis(
            segment_name=f"Origem: {source_val}",
            volume=volume,
            conversion_rate=conversion,
            avg_value_cents=avg_value,
            total_value_cents=int(total_value)
        ))
    
    # Segmentar por faixa de valor
    if not min_value_cents and not max_value_cents:
        value_ranges = [
            (0, 100000, "Baixo (até R$ 1.000)"),
            (100000, 500000, "Médio (R$ 1.000 - R$ 5.000)"),
            (500000, 2000000, "Alto (R$ 5.000 - R$ 20.000)"),
            (2000000, None, "Muito Alto (acima de R$ 20.000)"),
        ]
        
        for min_val, max_val, label in value_ranges:
            range_deals = db.query(Deal)
            if min_val:
                range_deals = range_deals.filter(Deal.value_cents >= min_val)
            if max_val:
                range_deals = range_deals.filter(Deal.value_cents < max_val)
            if pipeline_id:
                range_deals = range_deals.filter(Deal.pipeline_id == pipeline_id)
            if user_id:
                range_deals = range_deals.join(
                    DealAssignee, Deal.id == DealAssignee.deal_id
                ).filter(DealAssignee.user_id == user_id)
            
            volume = range_deals.filter(
                Deal.created_at >= datetime.combine(start_date, datetime.min.time()),
                Deal.created_at <= datetime.combine(end_date, datetime.max.time())
            ).count()
            
            won = range_deals.filter(Deal.status == DealStatus.WON).count()
            conversion = (won / volume * 100) if volume > 0 else 0.0
            
            total_value = db.query(func.coalesce(func.sum(Deal.value_cents), 0)).filter(
                Deal.status == DealStatus.WON
            )
            if min_val:
                total_value = total_value.filter(Deal.value_cents >= min_val)
            if max_val:
                total_value = total_value.filter(Deal.value_cents < max_val)
            total_value_cents = total_value.scalar() or 0
            
            avg_value = int(total_value_cents / won) if won > 0 else None
            
            segment_analysis.append(SegmentAnalysis(
                segment_name=label,
                volume=volume,
                conversion_rate=conversion,
                avg_value_cents=avg_value,
                total_value_cents=int(total_value_cents)
            ))
    
    return InteligenciaVendasResponse(
        sankey_nodes=sankey_nodes,
        sankey_links=sankey_links,
        stage_metrics=stage_metrics,
        insights=insights,
        forecast_total_cents=forecast_total,
        forecast_items=forecast_items[:20],  # Top 20
        sales_performance=sales_performance,
        segment_analysis=segment_analysis,
        period_start=start_date,
        period_end=end_date,
        previous_period_start=previous_start,
        previous_period_end=previous_end
    )




