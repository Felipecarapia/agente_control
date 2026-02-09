"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Pencil, Bot, Power, PowerOff, MessageSquare } from "lucide-react";

type AIAgent = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  system_prompt: string;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number | null;
  whatsapp_connection_id: string | null;
  is_active: boolean;
  created_at: string | null;
};

type WhatsAppConnection = {
  id: string;
  name: string;
  status: string;
};

export default function AgentesPage() {
  const router = useRouter();
  const [list, setList] = useState<AIAgent[]>([]);
  const [waConnections, setWaConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testAgentId, setTestAgentId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    system_prompt: "",
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 1024,
    whatsapp_connection_id: "",
    is_active: true,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [agents, connections] = await Promise.all([
        api<AIAgent[]>("/api/v1/agents"),
        api<WhatsAppConnection[]>("/api/v1/whatsapp/connections").catch(() => []),
      ]);
      setList(Array.isArray(agents) ? agents : []);
      setWaConnections(Array.isArray(connections) ? connections : []);
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
      name: "",
      description: "",
      system_prompt: "",
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 1024,
      whatsapp_connection_id: "",
      is_active: true,
    });
    setOpen(true);
  }

  function openEdit(a: AIAgent) {
    setEditId(a.id);
    setForm({
      name: a.name,
      description: a.description || "",
      system_prompt: a.system_prompt,
      provider: a.provider,
      model: a.model,
      temperature: a.temperature,
      max_tokens: a.max_tokens || 1024,
      whatsapp_connection_id: a.whatsapp_connection_id || "",
      is_active: a.is_active,
    });
    setOpen(true);
  }

  async function save() {
    try {
      const body: Record<string, unknown> = {
        ...form,
        whatsapp_connection_id: form.whatsapp_connection_id || null,
      };
      if (editId) {
        await api(`/api/v1/agents/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/api/v1/agents", { method: "POST", body: JSON.stringify(body) });
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
      await api(`/api/v1/agents/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadData();
    } catch (e: any) {
      alert(`Erro ao excluir: ${e?.message || "Erro desconhecido"}`);
    }
  }

  function openTest(agent: AIAgent) {
    setTestAgentId(agent.id);
    setTestMessage("");
    setTestResponse("");
    setTestOpen(true);
  }

  async function sendTest() {
    if (!testAgentId || !testMessage.trim()) return;
    setTestLoading(true);
    try {
      const result = await api<{ response: string; tokens_used?: number }>(
        `/api/v1/agents/${testAgentId}/test`,
        { method: "POST", body: JSON.stringify({ message: testMessage }) }
      );
      setTestResponse(result.response);
    } catch (e: any) {
      setTestResponse(`Erro: ${e?.message || "Falha ao testar agente"}`);
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agentes de IA</h1>
          <p className="text-muted-foreground">Crie e gerencie seus agentes inteligentes</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo Agente
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum agente</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie seu primeiro agente de IA para automatizar atendimentos.
            </p>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Novo Agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <Card key={a.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => router.push(`/dashboard/agentes/${a.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{a.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">{a.model}</p>
                    </div>
                  </div>
                  {a.is_active ? (
                    <Power className="h-4 w-4 text-green-400" />
                  ) : (
                    <PowerOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {a.description || "Sem descrição"}
                </p>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" onClick={() => openTest(a)}>
                    <MessageSquare className="h-3 w-3 mr-1" /> Testar
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog criar/editar agente */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Agente" : "Novo Agente de IA"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Agente Comercial" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descreva a função deste agente" />
            </div>
            <div className="grid gap-2">
              <Label>System Prompt</Label>
              <Textarea
                value={form.system_prompt}
                onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                placeholder="Você é um assistente comercial da empresa X. Seu objetivo é..."
                className="min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Modelo</Label>
                <Select value={form.model} onValueChange={(v) => setForm((f) => ({ ...f, model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Temperatura ({form.temperature})</Label>
                <Input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={form.max_tokens}
                  onChange={(e) => setForm((f) => ({ ...f, max_tokens: parseInt(e.target.value) || 1024 }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Conexão WhatsApp (opcional)</Label>
              <Select value={form.whatsapp_connection_id} onValueChange={(v) => setForm((f) => ({ ...f, whatsapp_connection_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {waConnections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="is_active">Agente ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog testar agente */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Testar Agente
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Mensagem de teste</Label>
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Digite uma mensagem para testar o agente..."
                className="min-h-[80px]"
              />
            </div>
            <Button onClick={sendTest} disabled={testLoading || !testMessage.trim()}>
              {testLoading ? "Processando..." : "Enviar"}
            </Button>
            {testResponse && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <Label className="text-xs text-muted-foreground">Resposta do agente:</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{testResponse}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O agente e suas conversas serão removidos.</AlertDialogDescription>
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
