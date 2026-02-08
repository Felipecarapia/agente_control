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
  id: number;
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
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus leads e oportunidades</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/leads/novo">
            <Plus className="h-4 w-4" />
            Novo Lead
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.novos}</p>
              <p className="text-xs text-muted-foreground">Novos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Flame className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.quentes}</p>
              <p className="text-xs text-muted-foreground">Quentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.ganhos}</p>
              <p className="text-xs text-muted-foreground">Ganhos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.perdidos}</p>
              <p className="text-xs text-muted-foreground">Perdidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar por nome, email, empresa ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={filterTemp}
            onChange={(e) => setFilterTemp(e.target.value)}
          >
            <option value="">Temperatura</option>
            <option value="frio">Frio</option>
            <option value="morno">Morno</option>
            <option value="quente">Quente</option>
            <option value="cliente">Cliente</option>
          </select>
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {(filterTemp || filterStatus) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterTemp(""); setFilterStatus(""); }} className="gap-1 text-xs">
              <Filter className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">Carregando...</div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum lead encontrado</h3>
            <p className="text-muted-foreground text-sm mb-6">Comece cadastrando seu primeiro lead.</p>
            <Button asChild className="gap-2">
              <Link href="/dashboard/leads/novo">
                <Plus className="h-4 w-4" />
                Novo Lead
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const temp = TEMP_CONFIG[lead.temperatura] || TEMP_CONFIG.frio;
            const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
            const TempIcon = temp.icon;
            return (
              <Link key={lead.id} href={`/dashboard/leads/${lead.id}`}>
                <Card className="hover:shadow-md transition-all hover:border-primary/20 cursor-pointer group">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-center gap-4">
                      {/* Temperatura Badge */}
                      <div className={`shrink-0 h-12 w-12 rounded-xl border flex items-center justify-center ${temp.bg}`}>
                        <TempIcon className={`h-5 w-5 ${temp.color}`} />
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-sm truncate">{lead.nome}</h3>
                          <span className={`shrink-0 h-2 w-2 rounded-full ${statusCfg.color}`} title={statusCfg.label} />
                          <span className="text-xs text-muted-foreground hidden sm:inline">{statusCfg.label}</span>
                          {lead.score !== null && lead.score > 0 && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {lead.score} pts
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {lead.empresa && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {lead.empresa}
                            </span>
                          )}
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </span>
                          )}
                          {(lead.whatsapp || lead.telefone) && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.whatsapp || lead.telefone}
                            </span>
                          )}
                          {lead.origem && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {ORIGEM_LABELS[lead.origem] || lead.origem}
                            </span>
                          )}
                          {lead.created_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
