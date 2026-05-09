"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus, Search, Target, Flame, Snowflake, Sun, Trophy,
  XCircle, Building2, Mail, Phone, Calendar, Filter,
  Users, TrendingUp, ChevronRight,
} from "lucide-react";

type Lead = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  empresa: string | null;
  cargo: string | null;
  temperatura: string;
  status: string;
  score: number | null;
  origem: string | null;
  origem_detalhe: string | null;
  interesse: string | null;
  proxima_acao: string | null;
  proxima_acao_data: string | null;
  ultimo_contato: string | null;
  created_at: string | null;
};

type Stats = {
  total: number;
  novos: number;
  quentes: number;
  ganhos: number;
  perdidos: number;
};

const TEMP_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Flame }> = {
  frio: { label: "Frio", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20", icon: Snowflake },
  morno: { label: "Morno", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", icon: Sun },
  quente: { label: "Quente", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20", icon: Flame },
  cliente: { label: "Cliente", color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", icon: Trophy },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-blue-500" },
  contatado: { label: "Contatado", color: "bg-indigo-500" },
  qualificado: { label: "Qualificado", color: "bg-purple-500" },
  proposta_enviada: { label: "Proposta Enviada", color: "bg-amber-500" },
  negociando: { label: "Negociando", color: "bg-orange-500" },
  ganho: { label: "Ganho", color: "bg-green-500" },
  perdido: { label: "Perdido", color: "bg-red-500" },
};

const ORIGEM_LABELS: Record<string, string> = {
  site: "Site",
  indicacao: "Indicação",
  google_ads: "Google Ads",
  facebook_ads: "Facebook Ads",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  evento: "Evento",
  cold_call: "Cold Call",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, novos: 0, quentes: 0, ganhos: 0, perdidos: 0 });
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [filterTemp, filterStatus]);

  async function fetchLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTemp) params.set("temperatura", filterTemp);
      if (filterStatus) params.set("status", filterStatus);
      if (search) params.set("search", search);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const response = await api<Lead[]>(`/api/v1/leads${qs}`);
      // apiClient já extrai data do formato {ok: true, data: [...]}
      setLeads(Array.isArray(response) ? response : []);
    } catch (err) {
      // Silenciar erro - não quebrar UX
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await api<Stats>("/api/v1/leads/stats/overview");
      // apiClient já extrai data do formato {ok: true, data: {...}}
      setStats(response || { total: 0, novos: 0, quentes: 0, ganhos: 0, perdidos: 0 });
    } catch {
      // Silenciar erro - usar valores padrão
      setStats({ total: 0, novos: 0, quentes: 0, ganhos: 0, perdidos: 0 });
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchLeads();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-foreground" style={{ fontSize: "1.4rem", letterSpacing: "-0.035em" }}>Leads</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie seus leads e oportunidades de negócio</p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/dashboard/leads/novo">
            <Plus className="h-3.5 w-3.5" /> Novo Lead
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total",    value: stats.total,    icon: Users,   accent: "hsl(var(--foreground))" },
          { label: "Novos",    value: stats.novos,    icon: Target,  accent: "#60a5fa" },
          { label: "Quentes",  value: stats.quentes,  icon: Flame,   accent: "#f87171" },
          { label: "Ganhos",   value: stats.ganhos,   icon: Trophy,  accent: "#34d399" },
          { label: "Perdidos", value: stats.perdidos, icon: XCircle, accent: "#f87171" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                <s.icon className="w-3.5 h-3.5" style={{ color: s.accent }} />
              </div>
              <p className="text-2xl font-bold" style={{ letterSpacing: "-0.04em" }}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Buscar por nome, email, empresa ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>
        <div className="flex gap-2">
          <select
            className="h-9 rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground focus:outline-none"
            value={filterTemp}
            onChange={e => setFilterTemp(e.target.value)}
          >
            <option value="">Temperatura</option>
            <option value="frio">Frio</option>
            <option value="morno">Morno</option>
            <option value="quente">Quente</option>
            <option value="cliente">Cliente</option>
          </select>
          <select
            className="h-9 rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground focus:outline-none"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {(filterTemp || filterStatus) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterTemp(""); setFilterStatus(""); }} className="h-9 gap-1 text-xs">
              <Filter className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl border border-border/50 bg-card animate-pulse" />)}
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border/60">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Target className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhum lead encontrado</h3>
          <p className="text-muted-foreground text-sm mb-5">Comece cadastrando seu primeiro lead.</p>
          <Button asChild size="sm" className="gap-2">
            <Link href="/dashboard/leads/novo"><Plus className="h-3.5 w-3.5" /> Novo Lead</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead, i) => {
            const temp = TEMP_CONFIG[lead.temperatura] || TEMP_CONFIG.frio;
            const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
            const TempIcon = temp.icon;
            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/dashboard/leads/${lead.id}`}>
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:border-foreground/15 hover:bg-muted/20 transition-all duration-200 group cursor-pointer">
                    {/* Temp icon */}
                    <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `hsl(var(--muted))` }}>
                      <TempIcon className={`h-4 w-4 ${temp.color}`} />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm truncate">{lead.nome}</h3>
                        <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${statusCfg.color}`} />
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">{statusCfg.label}</span>
                        {lead.score !== null && lead.score > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-foreground/8 text-foreground/60">
                            {lead.score}pts
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {lead.empresa && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.empresa}</span>}
                        {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                        {(lead.whatsapp || lead.telefone) && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.whatsapp || lead.telefone}</span>}
                        {lead.origem && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{ORIGEM_LABELS[lead.origem] || lead.origem}</span>}
                        {lead.created_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
