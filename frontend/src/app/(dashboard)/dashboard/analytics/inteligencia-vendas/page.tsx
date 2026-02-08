"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  Target,
  Lightbulb,
  BarChart3,
  RefreshCw,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SankeyDiagram } from "@/components/analytics/SankeyDiagram";
import { InsightsPanel } from "@/components/analytics/InsightsPanel";
import { ForecastChart } from "@/components/analytics/ForecastChart";
import { PerformanceTable } from "@/components/analytics/PerformanceTable";
import { SegmentAnalysis } from "@/components/analytics/SegmentAnalysis";

type InteligenciaVendasData = {
  sankey_nodes: Array<{ id: string; name: string; value: number; color?: string }>;
  sankey_links: Array<{
    source: string;
    target: string;
    value: number;
    conversion_rate: number;
    color?: string;
  }>;
  stage_metrics: Array<{
    stage_id: number;
    stage_name: string;
    order_index: number;
    volume: number;
    conversion_rate: number;
    avg_time_days: number | null;
    total_value_cents: number;
    avg_value_cents: number | null;
    variation_percentage: number | null;
  }>;
  insights: Array<{
    type: string;
    severity: string;
    title: string;
    message: string;
    stage_id?: number;
    stage_name?: string;
    value_cents?: number;
    suggestion?: string;
  }>;
  forecast_total_cents: number;
  forecast_items: Array<{
    deal_id: number;
    title: string;
    value_cents: number;
    probability: number;
    expected_close_date: string | null;
    stage_name: string;
  }>;
  sales_performance: Array<{
    user_id: number;
    user_nome: string;
    deals_created: number;
    deals_won: number;
    deals_lost: number;
    conversion_rate: number;
    total_revenue_cents: number;
    avg_deal_value_cents: number | null;
    avg_time_to_close_days: number | null;
    deals_by_stage: Record<string, number>;
  }>;
  segment_analysis: Array<{
    segment_name: string;
    volume: number;
    conversion_rate: number;
    avg_value_cents: number | null;
    total_value_cents: number;
  }>;
  period_start: string;
  period_end: string;
  previous_period_start: string;
  previous_period_end: string;
};

type Pipeline = { id: number; name: string; description: string | null; is_default: boolean };
type Usuario = { id: number; nome: string; email: string };

export default function InteligenciaVendasPage() {
  const [data, setData] = useState<InteligenciaVendasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  
  // Listas para selects
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Filtros
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [pipelineId, setPipelineId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [source, setSource] = useState<string>("all");
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");

  async function loadPipelinesAndUsers() {
    try {
      const [p, u] = await Promise.all([
        api<any>("/api/v1/pipelines").catch(() => ({ ok: true, data: [] })),
        api<any>("/api/v1/usuarios").catch(() => ({ ok: true, data: [] })),
      ]);
      
      const pipelinesData = p?.ok === true ? (p.data || []) : (Array.isArray(p) ? p : []);
      const usuariosData = u?.ok === true ? (u.data || []) : (Array.isArray(u) ? u : []);
      
      setPipelines(Array.isArray(pipelinesData) ? pipelinesData : []);
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      
      // Selecionar pipeline padrão se não houver seleção
      if (!pipelineId && pipelinesData.length > 0) {
        const defaultPipeline = pipelinesData.find((p: Pipeline) => p.is_default) || pipelinesData[0];
        if (defaultPipeline) {
          setPipelineId(String(defaultPipeline.id));
        }
      }
      
      return true; // Sucesso
    } catch (e) {
      console.error("Erro ao carregar pipelines/usuários:", e);
      setPipelines([]);
      setUsuarios([]);
      return false; // Falha
    }
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    setRequiresSetup(false);
    setSetupMessage(null);
    
    try {
      // Validar datas
      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        setError("Data inicial deve ser anterior à data final");
        setLoading(false);
        return;
      }
      
      // Validar valores
      if (minValue && maxValue && parseFloat(minValue) > parseFloat(maxValue)) {
        setError("Valor mínimo deve ser menor ou igual ao valor máximo");
        setLoading(false);
        return;
      }
      
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (pipelineId) params.append("pipeline_id", pipelineId);
      if (userId) params.append("user_id", userId);
      if (source && source !== "all") params.append("source", source);
      if (minValue && !isNaN(parseFloat(minValue))) {
        params.append("min_value_cents", String(Math.round(parseFloat(minValue) * 100)));
      }
      if (maxValue && !isNaN(parseFloat(maxValue))) {
        params.append("max_value_cents", String(Math.round(parseFloat(maxValue) * 100)));
      }

      const response = await api<any>(
        `/api/v1/analytics/inteligencia-vendas?${params.toString()}`
      );
      
      console.log("Response inteligencia-vendas:", response);
      
      // Extrair dados do formato padronizado
      const responseData = response?.ok === true ? response.data : response;
      const meta = response?.meta || {};
      
      // Verificar se precisa de setup
      if (meta.requiresSetup) {
        setRequiresSetup(true);
        setSetupMessage(meta.message || "Configuração necessária");
        setData({
          sankey_nodes: [],
          sankey_links: [],
          stage_metrics: [],
          insights: [],
          forecast_total_cents: 0,
          forecast_items: [],
          sales_performance: [],
          segment_analysis: [],
          period_start: startDate,
          period_end: endDate,
          previous_period_start: "",
          previous_period_end: "",
        });
        setLoading(false);
        return;
      }
      
      if (responseData && typeof responseData === 'object' && 'sankey_nodes' in responseData) {
        console.log("Dados recebidos:", responseData);
        setData(responseData as InteligenciaVendasData);
      } else {
        console.warn("Dados inválidos ou formato inesperado:", responseData);
        // Dados inválidos - criar estrutura vazia
        setData({
          sankey_nodes: [],
          sankey_links: [],
          stage_metrics: [],
          insights: [],
          forecast_total_cents: 0,
          forecast_items: [],
          sales_performance: [],
          segment_analysis: [],
          period_start: startDate,
          period_end: endDate,
          previous_period_start: "",
          previous_period_end: "",
        });
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorCode = (e as any)?.code || "UNKNOWN";
      const errorDetails = (e as any)?.details;
      
      console.error("Erro ao carregar dados de inteligência de vendas:");
      console.error("  Mensagem:", errorMsg);
      console.error("  Código:", errorCode);
      if (errorDetails) {
        console.error("  Detalhes:", errorDetails);
      }
      
      // Se for erro de pipeline não encontrado, mostrar setup
      if (errorCode === "PIPELINE_NOT_FOUND" || errorMsg.includes("pipeline")) {
        setRequiresSetup(true);
        setSetupMessage("Pipeline não encontrado. Selecione um pipeline válido.");
      } else {
        setError(errorMsg);
      }
      
      setData({
        sankey_nodes: [],
        sankey_links: [],
        stage_metrics: [],
        insights: [],
        forecast_total_cents: 0,
        forecast_items: [],
        sales_performance: [],
        segment_analysis: [],
        period_start: startDate,
        period_end: endDate,
        previous_period_start: "",
        previous_period_end: "",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      // Carregar pipelines e usuários primeiro
      await loadPipelinesAndUsers();
      // Sempre carregar dados (mesmo sem pipelines, para mostrar empty state)
      // Pequeno delay para garantir que pipelines foram setados
      setTimeout(() => {
        loadData();
      }, 100);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadData}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Inteligência de Vendas
          </h1>
          <p className="text-sm text-muted-foreground">
            Diagnóstico, previsão e otimização do funil de vendas
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pipeline</Label>
              <Select value={pipelineId || "all"} onValueChange={(val) => setPipelineId(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} {p.is_default && "(Padrão)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={userId || "all"} onValueChange={(val) => setUserId(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="rede_social">Rede Social</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Mínimo (R$)</Label>
              <Input
                type="number"
                placeholder="0"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Máximo (R$)</Label>
              <Input
                type="number"
                placeholder="0"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadData} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights Automáticos */}
      {data.insights.length > 0 && (
        <InsightsPanel insights={data.insights} />
      )}

      {/* Funil Visual Sankey */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Funil de Conversão
          </CardTitle>
          <CardDescription>
            Visualização do fluxo de leads através do funil
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requiresSetup ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Configuração Necessária</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                {setupMessage || "Nenhum pipeline encontrado. Selecione um pipeline ou crie um pipeline padrão para visualizar o funil."}
              </p>
              {pipelines.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Vá em Configurações → Pipelines para criar um pipeline.
                </p>
              )}
            </div>
          ) : data.sankey_nodes.length === 0 && data.sankey_links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum dado no período</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Não há dados de vendas no período selecionado. Tente ajustar as datas ou filtros.
              </p>
              <Button variant="outline" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          ) : (
            <SankeyDiagram nodes={data.sankey_nodes} links={data.sankey_links} />
          )}
        </CardContent>
      </Card>

      {/* Métricas por Etapa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métricas por Etapa</CardTitle>
          <CardDescription>
            Volume, conversão, tempo médio e valor por etapa do pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.stage_metrics.map((metric) => (
              <Card key={metric.stage_id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {metric.stage_name}
                    </CardTitle>
                    {metric.variation_percentage !== null && (
                      <Badge
                        variant={
                          metric.variation_percentage >= 0
                            ? "default"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {metric.variation_percentage >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(metric.variation_percentage).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volume:</span>
                    <span className="font-semibold">{metric.volume}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Conversão:</span>
                    <span className="font-semibold">
                      {metric.conversion_rate.toFixed(1)}%
                    </span>
                  </div>
                  {metric.avg_time_days && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tempo médio:</span>
                      <span className="font-semibold">
                        {metric.avg_time_days.toFixed(1)} dias
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Valor total:</span>
                    <span className="font-semibold">
                      {formatCurrency(metric.total_value_cents)}
                    </span>
                  </div>
                  {metric.avg_value_cents && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Ticket médio:</span>
                      <span className="font-semibold">
                        {formatCurrency(metric.avg_value_cents)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Funil Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Funil Financeiro
          </CardTitle>
          <CardDescription>
            Receita potencial, perdida e fechada por etapa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.stage_metrics.map((metric) => {
              // Calcular receita potencial (volume × ticket médio histórico)
              const potential_revenue = metric.volume * (metric.avg_value_cents || 0);
              // Receita fechada (apenas deals WON nesta etapa)
              const closed_revenue = metric.total_value_cents;
              // Receita perdida (potencial - fechada)
              const lost_revenue = potential_revenue - closed_revenue;

              return (
                <div
                  key={metric.stage_id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <h4 className="font-semibold text-sm">{metric.stage_name}</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Potencial</div>
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(potential_revenue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fechada</div>
                      <div className="font-semibold text-green-600">
                        {formatCurrency(closed_revenue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Perdida</div>
                      <div className="font-semibold text-red-600">
                        {formatCurrency(lost_revenue)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Previsão de Fechamento
          </CardTitle>
          <CardDescription>
            Valor previsto: {formatCurrency(data.forecast_total_cents)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForecastChart
            forecastTotal={data.forecast_total_cents}
            forecastItems={data.forecast_items}
          />
        </CardContent>
      </Card>

      {/* Performance por Vendedor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Performance por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceTable performance={data.sales_performance} />
        </CardContent>
      </Card>

      {/* Segmentação */}
      {data.segment_analysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Análise por Segmento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SegmentAnalysis segments={data.segment_analysis} />
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

