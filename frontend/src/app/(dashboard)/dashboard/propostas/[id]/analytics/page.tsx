"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  Users,
  Clock,
  MousePointerClick,
  Smartphone,
  Monitor,
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Target,
  ScrollText,
  ChevronDown,
  DollarSign,
  CheckCircle2,
  XCircle,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Em produção, deixe NEXT_PUBLIC_API_URL vazio para usar o proxy interno
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Tipos
interface AnalyticsOverview {
  proposta_id: number;
  total_sessions: number;
  unique_devices: number;
  total_events: number;
  avg_duration_seconds: number;
  avg_scroll_percent: number;
  total_clicks: number;
  cta_clicks: number;
  whatsapp_clicks: number;
  mobile_percent: number;
  desktop_percent: number;
  returning_percent: number;
}

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface SectionEngagement {
  section_id: string;
  section_type: string | null;
  views: number;
  avg_time_seconds: number;
  clicks: number;
  scroll_depth_reached: number;
}

interface DeviceBreakdown {
  mobile: number;
  desktop: number;
  tablet: number;
}

interface SessionDetail {
  id: number;
  session_id: string;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  country: string | null;
  started_at: string;
  duration_seconds: number | null;
  max_scroll_percent: number;
  total_clicks: number;
  is_returning: boolean;
  exit_intent_detected: boolean;
}

interface FAQEngagement {
  question_id: string;
  question_text: string | null;
  opens: number;
  avg_time_open_seconds: number;
}

interface FullAnalytics {
  overview: AnalyticsOverview;
  sessions_over_time: TimeSeriesPoint[];
  section_engagement: SectionEngagement[];
  device_breakdown: DeviceBreakdown;
  top_clicks: Array<{ element_id: string; section_id: string | null; count: number; last_clicked: string }>;
  faq_engagement: FAQEngagement[];
  recent_sessions: SessionDetail[];
  scroll_distribution: Record<string, number>;
}

// Formatadores
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Componente de Card de Métrica
function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {trend && (
          <p className={`text-xs ${trend.positive ? "text-green-600" : "text-red-600"}`}>
            {trend.positive ? "+" : ""}{trend.value}% vs período anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de gráfico simples de barras (sem lib externa)
// Mostra apenas dias com atividade
function SimpleBarChart({ data }: { data: TimeSeriesPoint[] }) {
  // Filtrar apenas dias com sessões
  const activeDays = data.filter(d => d.value > 0);
  
  if (activeDays.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Nenhuma sessão registrada neste período
      </div>
    );
  }
  
  const max = Math.max(...activeDays.map(d => d.value), 1);
  
  return (
    <div className="flex items-end gap-2 h-32">
      {activeDays.map((point, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1 min-w-[40px] max-w-[80px]"
          title={`${new Date(point.date).toLocaleDateString("pt-BR")}: ${point.value} sessões`}
        >
          <span className="text-xs font-medium text-muted-foreground">{point.value}</span>
          <div
            className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary cursor-default"
            style={{ height: `${Math.max((point.value / max) * 100, 10)}%` }}
          />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {new Date(point.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        </div>
      ))}
    </div>
  );
}

// Componente de distribuição de scroll
function ScrollDistribution({ data }: { data: Record<string, number> }) {
  const max = Math.max(...Object.values(data), 1);
  const thresholds = ["25", "50", "75", "100"];
  
  return (
    <div className="space-y-3">
      {thresholds.map((t) => (
        <div key={t} className="flex items-center gap-3">
          <span className="w-12 text-sm text-muted-foreground">{t}%</span>
          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
              style={{ width: `${(data[t] / max) * 100}%` }}
            />
          </div>
          <span className="w-12 text-sm font-medium text-right">{data[t] || 0}</span>
        </div>
      ))}
    </div>
  );
}

// Componente de distribuição de dispositivos
function DeviceChart({ data }: { data: DeviceBreakdown }) {
  const total = data.mobile + data.desktop + data.tablet || 1;
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div
          className="h-3 rounded-full bg-blue-500 transition-all"
          style={{ width: `${(data.desktop / total) * 100}%` }}
          title={`Desktop: ${data.desktop}`}
        />
        <div
          className="h-3 rounded-full bg-green-500 transition-all"
          style={{ width: `${(data.mobile / total) * 100}%` }}
          title={`Mobile: ${data.mobile}`}
        />
        <div
          className="h-3 rounded-full bg-orange-500 transition-all"
          style={{ width: `${(data.tablet / total) * 100}%` }}
          title={`Tablet: ${data.tablet}`}
        />
      </div>
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-blue-500" />
          <span>Desktop: {data.desktop}</span>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-green-500" />
          <span>Mobile: {data.mobile}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-orange-500" />
          <span>Tablet: {data.tablet}</span>
        </div>
      </div>
    </div>
  );
}

export default function ProposalAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [analytics, setAnalytics] = useState<FullAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/v1/tracking/proposals/${id}/analytics?days=${days}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar analytics: ${response.status}`);
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [id, days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchAnalytics}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          Nenhum dado de analytics disponível.
        </div>
      </div>
    );
  }

  const { overview, sessions_over_time, section_engagement, device_breakdown, recent_sessions, scroll_distribution, faq_engagement } = analytics;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/propostas/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Analytics da Proposta</h1>
            <p className="text-muted-foreground">Acompanhe o engajamento e comportamento dos visitantes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={14}>Últimos 14 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <Button variant="outline" size="icon" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Visualizações"
          value={overview.total_sessions}
          icon={Eye}
          description={`${overview.unique_devices} dispositivos únicos`}
        />
        <MetricCard
          title="Tempo Médio"
          value={formatDuration(overview.avg_duration_seconds)}
          icon={Clock}
          description="Duração média da sessão"
        />
        <MetricCard
          title="Scroll Médio"
          value={`${Math.round(overview.avg_scroll_percent)}%`}
          icon={ScrollText}
          description="Profundidade média de scroll"
        />
        <MetricCard
          title="Total de Cliques"
          value={overview.total_clicks}
          icon={MousePointerClick}
          description={`${overview.cta_clicks} em CTAs`}
        />
      </div>

      {/* Métricas de Conversão */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Cliques em CTA"
          value={overview.cta_clicks}
          icon={Target}
          description="Botões de ação principal"
        />
        <MetricCard
          title="Cliques WhatsApp"
          value={overview.whatsapp_clicks}
          icon={MessageCircle}
          description="Contatos via WhatsApp"
        />
        <MetricCard
          title="Visitantes Recorrentes"
          value={`${Math.round(overview.returning_percent)}%`}
          icon={RefreshCw}
          description="Voltaram à proposta"
        />
      </div>

      {/* Card Especial: Serviços e Valores (Tabela de Preços) */}
      {(() => {
        const servicosSection = section_engagement.find(
          s => s.section_type === "servicos_valores" || s.section_id?.includes("servicos")
        );
        const viewRate = servicosSection 
          ? Math.round((servicosSection.views / (overview.total_sessions || 1)) * 100) 
          : 0;
        
        return (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Tabela de Preços (Serviços e Valores)
              </CardTitle>
              <CardDescription>
                Seção crítica para conversão - acompanhe de perto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {servicosSection ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <Eye className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{servicosSection.views}</div>
                    <div className="text-xs text-muted-foreground">Visualizações</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <Percent className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{viewRate}%</div>
                    <div className="text-xs text-muted-foreground">Taxa de Alcance</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{formatDuration(servicosSection.avg_time_seconds)}</div>
                    <div className="text-xs text-muted-foreground">Tempo Médio</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg border">
                    <MousePointerClick className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">{servicosSection.clicks}</div>
                    <div className="text-xs text-muted-foreground">Cliques</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum dado registrado para a seção de preços.</p>
                  <p className="text-xs mt-1">Certifique-se que a seção "Serviços e Valores" está na proposta.</p>
                </div>
              )}
              
              {servicosSection && viewRate < 50 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-amber-600">Atenção:</span>{" "}
                    <span className="text-muted-foreground">
                      Menos de 50% dos visitantes chegam até a tabela de preços. 
                      Considere encurtar seções anteriores ou adicionar CTAs intermediários.
                    </span>
                  </div>
                </div>
              )}
              
              {servicosSection && viewRate >= 70 && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-green-600">Excelente!</span>{" "}
                    <span className="text-muted-foreground">
                      {viewRate}% dos visitantes chegam até a tabela de preços. 
                      Seu conteúdo está engajando bem.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sessões ao longo do tempo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sessões ao Longo do Tempo
            </CardTitle>
            <CardDescription>
              Dias com visitas nos últimos {days} dias 
              ({sessions_over_time.filter(d => d.value > 0).length} dias com atividade)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={sessions_over_time} />
          </CardContent>
        </Card>

        {/* Distribuição de Scroll */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChevronDown className="h-5 w-5" />
              Profundidade de Scroll
            </CardTitle>
            <CardDescription>Quantos visitantes chegaram em cada ponto</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollDistribution data={scroll_distribution} />
          </CardContent>
        </Card>
      </div>

      {/* Dispositivos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Dispositivos
          </CardTitle>
          <CardDescription>Distribuição por tipo de dispositivo</CardDescription>
        </CardHeader>
        <CardContent>
          <DeviceChart data={device_breakdown} />
        </CardContent>
      </Card>

      {/* Engajamento por Seção */}
      {section_engagement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Engajamento por Seção</CardTitle>
            <CardDescription>Visualizações e tempo médio em cada seção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {section_engagement.map((section) => (
                <div key={section.section_id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {section.section_type || section.section_id}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {section.views} views • {formatDuration(section.avg_time_seconds)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min((section.views / (overview.total_sessions || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ Engagement */}
      {faq_engagement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Engajamento com FAQ</CardTitle>
            <CardDescription>Perguntas mais visualizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {faq_engagement.map((faq) => (
                <div key={faq.question_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm flex-1 truncate">
                    {faq.question_text || faq.question_id}
                  </span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{faq.opens} aberturas</span>
                    <span>{formatDuration(faq.avg_time_open_seconds)} média</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessões Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sessões Recentes
          </CardTitle>
          <CardDescription>Últimas visitas à proposta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recent_sessions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhuma sessão registrada ainda.
              </p>
            ) : (
              recent_sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {session.device_type === "mobile" ? (
                      <Smartphone className="h-4 w-4 text-green-500" />
                    ) : (
                      <Monitor className="h-4 w-4 text-blue-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {session.browser || "Navegador"} • {session.os || "OS"}
                        {session.is_returning && (
                          <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                            Recorrente
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.city && session.country
                          ? `${session.city}, ${session.country}`
                          : "Localização não disponível"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {session.duration_seconds
                        ? formatDuration(session.duration_seconds)
                        : "Em andamento"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(session.started_at)} • {session.max_scroll_percent}% scroll
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
