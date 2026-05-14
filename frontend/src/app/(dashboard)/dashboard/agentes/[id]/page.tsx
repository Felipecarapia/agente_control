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
  cliente_id: string | null;
  google_client_id: string | null;
  google_calendar_id: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type ClienteSimple = {
  id: string;
  nome: string;
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
  const [clientes, setClientes] = useState<ClienteSimple[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    system_prompt: "",
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 1024,
    whatsapp_connection_id: "",
    cliente_id: "",
    google_client_id: "",
    google_calendar_id: "",
    is_active: true,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [agentData, convsData, connectionsData, logsData, clsData] = await Promise.all([
        api<AIAgent>(`/api/v1/agents/${id}`),
        api<Conversation[]>(`/api/v1/agents/${id}/conversations`).catch(() => []),
        api<WhatsAppConnection[]>("/api/v1/whatsapp/connections").catch(() => []),
        api<AgentLog[]>(`/api/v1/agents/${id}/logs`).catch(() => []),
        api<ClienteSimple[]>("/api/v1/clientes").catch(() => []),
      ]);
      setAgent(agentData);
      setConversations(Array.isArray(convsData) ? convsData : []);
      setWaConnections(Array.isArray(connectionsData) ? connectionsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setClientes(Array.isArray(clsData) ? clsData : []);
      setForm({
        id: agentData.id,
        name: agentData.name,
        description: agentData.description || "",
        system_prompt: agentData.system_prompt,
        provider: agentData.provider,
        model: agentData.model,
        temperature: agentData.temperature,
        max_tokens: agentData.max_tokens || 1024,
        whatsapp_connection_id: agentData.whatsapp_connection_id || "",
        cliente_id: agentData.cliente_id || "",
        google_client_id: agentData.google_client_id || "",
        google_calendar_id: agentData.google_calendar_id || "",
        is_active: agentData.is_active,
      });
    } catch (e: any) {
      console.error("Erro ao carregar dados do agente:", e);
    } finally {
      setLoading(false);
      // Checar sucesso do google via URL
      if (typeof window !== "undefined" && window.location.search.includes("google=success")) {
          setTimeout(() => {
              alert("✅ Sucesso! A sua conta Google Calendar foi conectada ao sistema!");
          }, 500);
      }
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
        cliente_id: form.cliente_id && form.cliente_id !== "none" ? form.cliente_id : null,
        google_client_id: form.google_client_id || null,
        google_calendar_id: form.google_calendar_id || null,
      };
      await api(`/api/v1/agents/${id}`, { method: "PUT", body: JSON.stringify(body) });
      loadData();
    } catch (e: any) {
      alert(`Erro ao salvar: ${e?.message || "Erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  }

  // Estado para o histórico do chat de teste
  const [testChat, setTestChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  async function sendTest() {
    if (!testMessage.trim()) return;
    
    const userMsg = testMessage.trim();
    setTestMessage("");
    setTestChat(prev => [...prev, { role: "user", content: userMsg }]);
    setTestLoading(true);
    
    try {
      // Enviamos o histórico atual + a nova mensagem para o backend
      const result = await api<{ response: string; tokens_used?: number }>(
        `/api/v1/agents/${id}/test`,
        { 
          method: "POST", 
          body: JSON.stringify({ 
            message: userMsg,
            history: testChat
          }) 
        }
      );
      
      setTestChat(prev => [...prev, { role: "assistant", content: result.response }]);
    } catch (e: any) {
      setTestChat(prev => [...prev, { role: "assistant", content: `❌ Erro: ${e?.message || "Falha ao processar mensagem"}` }]);
    } finally {
      setTestLoading(false);
    }
  }

  function clearTestChat() {
    setTestChat([]);
    setTestResponse("");
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
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm">{agent.description || "Sem descrição"}</p>
            {agent.cliente_id && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                Dono: {clientes.find(cl => cl.id === agent.cliente_id)?.nome || "Cliente"}
              </span>
            )}
          </div>
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

              <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                <div className="grid gap-2">
                  <Label>Google Client ID</Label>
                  <Input 
                    placeholder="Ex: 123456789-abc.apps.googleusercontent.com" 
                    value={form.google_client_id} 
                    onChange={(e) => setForm((f) => ({ ...f, google_client_id: e.target.value }))} 
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Google Calendar ID</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] gap-1.5 border-primary/30 hover:bg-primary/10"
                      onClick={async () => {
                        try {
                          const res = await api<{url: string}>(`/api/v1/auth/google/login?tenant_id=${form.id || ""}`); // Usando form.id como fallback ou adicione lógica para o tenant
                          if (res.url) window.location.href = res.url;
                        } catch (e: any) {
                          alert(`Erro ao iniciar conexão: ${e?.message || JSON.stringify(e)}`);
                        }
                      }}
                    >
                      <Bot className="h-3 w-3" /> Conectar Conta
                    </Button>
                  </div>
                  <Input 
                    placeholder="Ex: primary ou hash@group.calendar.google.com" 
                    value={form.google_calendar_id} 
                    onChange={(e) => setForm((f) => ({ ...f, google_calendar_id: e.target.value }))} 
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Dono (Cliente)</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm((f) => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Global)</SelectItem>
                    {clientes.map((cl) => (
                      <SelectItem key={cl.id} value={cl.id}>{cl.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground italic">Associe este agente a um cliente para organizar o atendimento.</p>
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
          <Card className="flex flex-col h-[500px] border-primary/20 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-muted/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="p-1 rounded-md bg-primary/10">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                Sandbox do Agente
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearTestChat} 
                className="h-7 px-2 text-[10px] uppercase font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                Limpar
              </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
              {/* Área do Chat */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-primary/10 scroll-smooth">
                {testChat.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-60">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2 shadow-inner">
                      <Bot className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">Inicie o Teste</p>
                      <p className="text-[10px] text-muted-foreground max-w-[180px]">Mande um oi para validar o comportamento e o tom de voz do seu agente.</p>
                    </div>
                  </div>
                ) : (
                  testChat.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-muted/80 border border-primary/10 rounded-tl-none"
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {testLoading && (
                  <div className="flex justify-start animate-in fade-in duration-200">
                    <div className="bg-muted/80 border border-primary/10 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1.5 items-center">
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input de Mensagem */}
              <div className="flex gap-2 pt-3 border-t mt-auto items-end">
                <Textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendTest();
                    }
                  }}
                  placeholder="Envie uma mensagem de teste..."
                  className="min-h-[44px] max-h-[120px] bg-muted/40 border-primary/10 focus-visible:ring-primary/30 resize-none py-3 text-xs"
                  disabled={testLoading}
                />
                <Button 
                  size="icon" 
                  onClick={sendTest} 
                  disabled={testLoading || !testMessage.trim()} 
                  className="shrink-0 h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Save className="h-5 w-5 rotate-90" />
                </Button>
              </div>
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
