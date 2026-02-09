"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, Megaphone, Eye } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  config_json: Record<string, unknown> | null;
  agent_id: string | null;
  whatsapp_connection_id: string | null;
  total_leads_found: number;
  created_at: string | null;
};

type AIAgent = {
  id: string;
  name: string;
};

type WhatsAppConnection = {
  id: string;
  name: string;
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-400" },
  running: { label: "Executando", color: "bg-blue-500/20 text-blue-400" },
  paused: { label: "Pausada", color: "bg-yellow-500/20 text-yellow-400" },
  completed: { label: "Concluída", color: "bg-green-500/20 text-green-400" },
  failed: { label: "Falhou", color: "bg-red-500/20 text-red-400" },
};

const typeLabels: Record<string, string> = {
  prospecting: "Prospecção",
  whatsapp_blast: "WhatsApp em Massa",
  email: "Email",
  custom: "Personalizada",
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
    name: "",
    description: "",
    type: "prospecting",
    agent_id: "",
    whatsapp_connection_id: "",
    city: "",
    activity: "",
    state: "",
    max_results: 50,
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
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({
      name: "", description: "", type: "prospecting",
      agent_id: "", whatsapp_connection_id: "",
      city: "", activity: "", state: "", max_results: 50,
    });
    setOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditId(c.id);
    const config = c.config_json || {};
    setForm({
      name: c.name,
      description: c.description || "",
      type: c.type,
      agent_id: c.agent_id || "",
      whatsapp_connection_id: c.whatsapp_connection_id || "",
      city: (config.city as string) || "",
      activity: (config.activity as string) || "",
      state: (config.state as string) || "",
      max_results: (config.max_results as number) || 50,
    });
    setOpen(true);
  }

  async function save() {
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        type: form.type,
        agent_id: form.agent_id && form.agent_id !== "none" ? form.agent_id : null,
        whatsapp_connection_id: form.whatsapp_connection_id && form.whatsapp_connection_id !== "none" ? form.whatsapp_connection_id : null,
        config_json: form.type === "prospecting" ? {
          city: form.city,
          activity: form.activity,
          state: form.state,
          max_results: form.max_results,
        } : null,
      };
      if (editId) {
        await api(`/api/v1/campaigns/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/api/v1/campaigns", { method: "POST", body: JSON.stringify(body) });
      }
      setOpen(false);
      loadData();
    } catch (e: any) {
      alert(`Erro ao salvar: ${e?.message || "Erro desconhecido"}`);
    }
  }

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/campaigns/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadData();
    } catch (e: any) {
      alert(`Erro ao excluir: ${e?.message || "Erro desconhecido"}`);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">Gerencie suas campanhas de prospecção e marketing</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova Campanha
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma campanha</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie sua primeira campanha de prospecção inteligente.
            </p>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nova Campanha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c) => {
                  const statusInfo = statusLabels[c.status] || statusLabels.draft;
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/campanhas/${c.id}`)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{typeLabels[c.type] || c.type}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell>{c.total_leads_found}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "-"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/campanhas/${c.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog criar/editar campanha */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Prospecção Dentistas SP" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descreva o objetivo da campanha" />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecção</SelectItem>
                  <SelectItem value="whatsapp_blast">WhatsApp em Massa</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === "prospecting" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="São Paulo" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Estado</Label>
                    <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="SP" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Atividade / Tipo de Negócio</Label>
                  <Input value={form.activity} onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value }))} placeholder="Dentista, Restaurante, Loja de roupas..." />
                </div>
                <div className="grid gap-2">
                  <Label>Máx. Resultados</Label>
                  <Input type="number" value={form.max_results} onChange={(e) => setForm((f) => ({ ...f, max_results: parseInt(e.target.value) || 50 }))} />
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label>Agente de IA (opcional)</Label>
              <Select value={form.agent_id} onValueChange={(v) => setForm((f) => ({ ...f, agent_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Conexão WhatsApp (opcional)</Label>
              <Select value={form.whatsapp_connection_id} onValueChange={(v) => setForm((f) => ({ ...f, whatsapp_connection_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {waConnections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
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
    </motion.div>
  );
}
