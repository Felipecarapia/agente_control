"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Bot, MessageSquare, Save, Loader2 } from "lucide-react";

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
  updated_at: string | null;
};

type Conversation = {
  id: string;
  agent_id: string;
  external_phone: string | null;
  channel: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
};

type WhatsAppConnection = {
  id: string;
  name: string;
  status: string;
};

type AgentLog = {
  id: string;
  action: string;
  details: string;
  tokens_used: number;
  created_at: string | null;
};

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [agent, setAgent] = useState<AIAgent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [waConnections, setWaConnections] = useState<WhatsAppConnection[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const [agentData, convsData, connectionsData, logsData] = await Promise.all([
        api<AIAgent>(`/api/v1/agents/${id}`),
        api<Conversation[]>(`/api/v1/agents/${id}/conversations`).catch(() => []),
        api<WhatsAppConnection[]>("/api/v1/whatsapp/connections").catch(() => []),
        api<AgentLog[]>(`/api/v1/agents/${id}/logs`).catch(() => []),
      ]);
      setAgent(agentData);
      setConversations(Array.isArray(convsData) ? convsData : []);
      setWaConnections(Array.isArray(connectionsData) ? connectionsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setForm({
        name: agentData.name,
        description: agentData.description || "",
        system_prompt: agentData.system_prompt,
        provider: agentData.provider,
        model: agentData.model,
        temperature: agentData.temperature,
        max_tokens: agentData.max_tokens || 1024,
        whatsapp_connection_id: agentData.whatsapp_connection_id || "",
        is_active: agentData.is_active,
      });
    } catch {
      router.push("/dashboard/agentes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function save() {
    setSaving(true);
    try {
      const body = {
        ...form,
        whatsapp_connection_id: form.whatsapp_connection_id && form.whatsapp_connection_id !== "none" ? form.whatsapp_connection_id : null,
      };
      await api(`/api/v1/agents/${id}`, { method: "PUT", body: JSON.stringify(body) });
      loadData();
    } catch (e: any) {
      alert(`Erro ao salvar: ${e?.message || "Erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testMessage.trim()) return;
    setTestLoading(true);
    try {
      const result = await api<{ response: string; tokens_used?: number }>(
        `/api/v1/agents/${id}/test`,
        { method: "POST", body: JSON.stringify({ message: testMessage }) }
      );
      setTestResponse(result.response);
    } catch (e: any) {
      setTestResponse(`Erro: ${e?.message || "Falha ao testar agente"}`);
    } finally {
      setTestLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agent) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/agentes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6" /> {agent.name}
          </h1>
          <p className="text-muted-foreground text-sm">{agent.description || "Sem descrição"}</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuração */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Configuração</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                  className="min-h-[180px]"
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
                  <Input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={(e) => setForm((f) => ({ ...f, temperature: parseFloat(e.target.value) }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Max Tokens</Label>
                  <Input type="number" value={form.max_tokens} onChange={(e) => setForm((f) => ({ ...f, max_tokens: parseInt(e.target.value) || 1024 }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Conexão WhatsApp</Label>
                <Select value={form.whatsapp_connection_id} onValueChange={(v) => setForm((f) => ({ ...f, whatsapp_connection_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {waConnections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.status})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-input" />
                <Label htmlFor="is_active">Agente ativo</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Testar agente */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Testar Agente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="min-h-[80px]"
              />
              <Button className="w-full" onClick={sendTest} disabled={testLoading || !testMessage.trim()}>
                {testLoading ? "Processando..." : "Enviar"}
              </Button>
              {testResponse && (
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Resposta:</p>
                  <p className="text-sm whitespace-pre-wrap">{testResponse}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversas recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conversas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa ainda</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversations.slice(0, 10).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm">{c.external_phone || "-"}</TableCell>
                        <TableCell className="text-sm capitalize">{c.channel}</TableCell>
                        <TableCell className="text-sm capitalize">{c.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Logs Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Logs de Atividade</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum log registrado</p>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {logs.map((log) => (
                    <div key={log.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">{log.action}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{log.details}</p>
                      {log.tokens_used > 0 && (
                        <p className="text-[10px] text-emerald-500 mt-1 font-mono">Tokens: {log.tokens_used}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
