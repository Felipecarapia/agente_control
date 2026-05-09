"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, Megaphone, Eye, Users, Target, CheckCircle2, XCircle, PauseCircle, Clock, ChevronRight } from "lucide-react";

type Campaign = {
  id: string; name: string; description: string | null;
  type: string; status: string;
  config_json: Record<string, unknown> | null;
  agent_id: string | null; whatsapp_connection_id: string | null;
  total_leads_found: number; created_at: string | null;
};
type AIAgent = { id: string; name: string };
type WhatsAppConnection = { id: string; name: string };

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  draft:     { label: "Rascunho",  icon: Clock,         color: "text-muted-foreground", bg: "bg-muted/60" },
  running:   { label: "Executando",icon: Target,        color: "text-blue-400",          bg: "bg-blue-500/10" },
  paused:    { label: "Pausada",   icon: PauseCircle,   color: "text-amber-400",         bg: "bg-amber-500/10" },
  completed: { label: "Concluída", icon: CheckCircle2,  color: "text-emerald-400",       bg: "bg-emerald-500/10" },
  failed:    { label: "Falhou",    icon: XCircle,       color: "text-red-400",           bg: "bg-red-500/10" },
};

const TYPE_LABELS: Record<string, string> = {
  prospecting: "Prospecção", whatsapp_blast: "WhatsApp em Massa",
  email: "Email", custom: "Personalizada",
};

export default function CampanhasPage() {
  const router = useRouter();
  const [list, setList] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [waConnections, setWaConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", type: "prospecting",
    agent_id: "", whatsapp_connection_id: "",
    city: "", activity: "", state: "", max_results: 50,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [campaigns, agentsData, connectionsData] = await Promise.all([
        api<Campaign[]>("/api/v1/campaigns"),
        api<AIAgent[]>("/api/v1/agents").catch(() => []),
        api<WhatsAppConnection[]>("/api/v1/whatsapp/connections").catch(() => []),
      ]);
      setList(Array.isArray(campaigns) ? campaigns : []);
      setAgents(Array.isArray(agentsData) ? agentsData : []);
      setWaConnections(Array.isArray(connectionsData) ? connectionsData : []);
    } catch { setList([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  function openCreate() {
    setEditId(null);
    setForm({ name: "", description: "", type: "prospecting", agent_id: "", whatsapp_connection_id: "", city: "", activity: "", state: "", max_results: 50 });
    setOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditId(c.id);
    const config = c.config_json || {};
    setForm({ name: c.name, description: c.description || "", type: c.type, agent_id: c.agent_id || "", whatsapp_connection_id: c.whatsapp_connection_id || "", city: (config.city as string) || "", activity: (config.activity as string) || "", state: (config.state as string) || "", max_results: (config.max_results as number) || 50 });
    setOpen(true);
  }

  async function save() {
    try {
      const body = {
        name: form.name, description: form.description, type: form.type,
        agent_id: form.agent_id && form.agent_id !== "none" ? form.agent_id : null,
        whatsapp_connection_id: form.whatsapp_connection_id && form.whatsapp_connection_id !== "none" ? form.whatsapp_connection_id : null,
        config_json: form.type === "prospecting" ? { city: form.city, activity: form.activity, state: form.state, max_results: form.max_results } : null,
      };
      if (editId) await api(`/api/v1/campaigns/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      else await api("/api/v1/campaigns", { method: "POST", body: JSON.stringify(body) });
      setOpen(false); loadData();
    } catch (e: any) { alert(`Erro ao salvar: ${e?.message || "Erro desconhecido"}`); }
  }

  async function remove() {
    if (!deleteId) return;
    try { await api(`/api/v1/campaigns/${deleteId}`, { method: "DELETE" }); setDeleteId(null); loadData(); }
    catch (e: any) { alert(`Erro ao excluir: ${e?.message || "Erro desconhecido"}`); }
  }

  // Summary stats
  const stats = {
    total: list.length,
    running: list.filter(c => c.status === "running").length,
    totalLeads: list.reduce((s, c) => s + c.total_leads_found, 0),
    completed: list.filter(c => c.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground" style={{ fontSize: "1.4rem", letterSpacing: "-0.035em" }}>Campanhas</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie campanhas de prospecção e marketing</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-2">
          <Plus className="h-3.5 w-3.5" /> Nova Campanha
        </Button>
      </motion.div>

      {/* Summary stats */}
      {!loading && list.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Megaphone },
            { label: "Em execução", value: stats.running, icon: Target },
            { label: "Leads gerados", value: stats.totalLeads, icon: Users },
            { label: "Concluídas", value: stats.completed, icon: CheckCircle2 },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ letterSpacing: "-0.04em" }}>{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl border border-border/50 bg-card animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border/60"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Megaphone className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Nenhuma campanha</h3>
          <p className="text-sm text-muted-foreground mb-5 text-center max-w-xs">
            Crie sua primeira campanha de prospecção inteligente com IA.
          </p>
          <Button onClick={openCreate} size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Nova Campanha</Button>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_110px_80px_140px_100px] gap-4 px-5 py-3 border-b border-border/50">
            {["Nome", "Tipo", "Status", "Leads", "Criada em", "Ações"].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</span>
            ))}
          </div>

          <div className="divide-y divide-border/30">
            <AnimatePresence>
              {list.map((c, i) => {
                const meta = STATUS_META[c.status] || STATUS_META.draft;
                const StatusIcon = meta.icon;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="grid grid-cols-[1fr_120px_110px_80px_140px_100px] gap-4 px-5 py-3.5 items-center hover:bg-muted/20 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/dashboard/campanhas/${c.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      {c.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.description}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{TYPE_LABELS[c.type] || c.type}</span>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md ${meta.bg} ${meta.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-sm font-semibold font-mono">{c.total_leads_found}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"}
                    </span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/dashboard/campanhas/${c.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              {editId ? "Editar Campanha" : "Nova Campanha"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Prospecção Dentistas SP" className="h-9" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Objetivo da campanha" className="resize-none" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecção</SelectItem>
                  <SelectItem value="whatsapp_blast">WhatsApp em Massa</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === "prospecting" && (
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuração de Prospecção</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="São Paulo" className="h-8 text-sm" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="SP" className="h-8 text-sm" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Atividade / Tipo de Negócio</Label>
                  <Input value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))} placeholder="Dentista, Restaurante..." className="h-8 text-sm" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Máx. Resultados</Label>
                  <Input type="number" value={form.max_results} onChange={e => setForm(f => ({ ...f, max_results: parseInt(e.target.value) || 50 }))} className="h-8 text-sm" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agente de IA</Label>
                <Select value={form.agent_id} onValueChange={v => setForm(f => ({ ...f, agent_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp</Label>
                <Select value={form.whatsapp_connection_id} onValueChange={v => setForm(f => ({ ...f, whatsapp_connection_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {waConnections.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={save}>Salvar campanha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="border-border/60 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. A campanha e todos os leads associados serão removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
