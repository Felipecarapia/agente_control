"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Play,
  Loader2,
  MapPin,
  Phone,

  Star,
  UserPlus,
  Check,
  MessageSquare,
  Bot,
  ChevronDown,
  ChevronUp,
  Zap,
  Send,
} from "lucide-react";

/* ───── Types ───── */

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  config_json: Record<string, unknown> | null;
  total_leads_found: number;
  created_at: string | null;
};

type CampaignLead = {
  id: string;
  campaign_id: string;
  business_name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  rating: number | null;
  source: string;
  status: string;
  found_at: string | null;
};

type CampaignMessage = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  sent_via: string;
  created_at: string | null;
};

type CampaignConversation = {
  id: string;
  campaign_lead_id: string;
  status: string;
  message_count: number;
  interest_detected: boolean;
  started_at: string | null;
  ended_at: string | null;
  messages: CampaignMessage[];
  business_name: string | null;
  phone: string | null;
  lead_status: string | null;
};

/* ───── Labels ───── */

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-500/20 text-gray-400" },
  running: { label: "Executando", color: "bg-blue-500/20 text-blue-400" },
  paused: { label: "Pausada", color: "bg-yellow-500/20 text-yellow-400" },
  completed: { label: "Concluída", color: "bg-green-500/20 text-green-400" },
  failed: { label: "Falhou", color: "bg-red-500/20 text-red-400" },
};

const leadStatusLabels: Record<string, { label: string; color: string }> = {
  found: { label: "Encontrado", color: "bg-blue-500/20 text-blue-400" },
  queued: { label: "Na Fila", color: "bg-yellow-500/20 text-yellow-400" },
  contacted: { label: "Contactado", color: "bg-purple-500/20 text-purple-400" },
  responded: { label: "Respondeu", color: "bg-green-500/20 text-green-400" },
  converted: { label: "Convertido", color: "bg-emerald-500/20 text-emerald-400" },
};

const convStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativa", variant: "default" },
  closed: { label: "Encerrada", variant: "secondary" },
  converted: { label: "Convertido", variant: "outline" },
};

/* ───── Component ───── */

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [prospectResult, setProspectResult] = useState<string | null>(null);

  // Conversas IA
  const [conversations, setConversations] = useState<CampaignConversation[]>([]);
  const [expandedConvId, setExpandedConvId] = useState<string | null>(null);
  const [startingConvLeadId, setStartingConvLeadId] = useState<string | null>(null);
  const [outreachDialogOpen, setOutreachDialogOpen] = useState(false);
  const [outreachRunning, setOutreachRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("leads");
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── Load data ── */

  async function loadData() {
    setLoading(true);
    try {
      const [campaignData, leadsData] = await Promise.all([
        api<Campaign>(`/api/v1/campaigns/${id}`),
        api<CampaignLead[]>(`/api/v1/campaigns/${id}/leads`).catch(() => []),
      ]);
      setCampaign(campaignData);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
    } catch {
      router.push("/dashboard/campanhas");
    } finally {
      setLoading(false);
    }
  }

  const loadConversations = useCallback(async (silent = false) => {
    try {
      const data = await api<CampaignConversation[]>(`/api/v1/campaigns/${id}/conversations`);
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      if (!silent) {
        toast({ title: "Erro ao carregar conversas", variant: "destructive" });
      }
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  // Load conversations when switching to tab
  useEffect(() => {
    if (activeTab === "conversas" && id) {
      loadConversations();
    }
  }, [activeTab, id, loadConversations]);

  // Polling
  useEffect(() => {
    if (activeTab !== "conversas") return;
    const interval = setInterval(() => loadConversations(true), 5000);
    return () => clearInterval(interval);
  }, [activeTab, loadConversations]);

  // Auto-scroll chat
  useEffect(() => {
    if (expandedConvId && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [expandedConvId, conversations]);

  /* ── Actions ── */

  async function runProspecting() {
    setRunning(true);
    setProspectResult(null);
    try {
      const result = await api<{ message: string; new_leads: number; total_found: number }>(
        `/api/v1/campaigns/${id}/run`,
        { method: "POST" }
      );
      setProspectResult(result.message);
      loadData();
    } catch (e: any) {
      setProspectResult(`Erro: ${e?.message || "Falha na prospecção"}`);
      loadData();
    } finally {
      setRunning(false);
    }
  }

  async function convertLead(leadId: string) {
    setConvertingId(leadId);
    try {
      await api(`/api/v1/campaigns/${id}/leads/${leadId}/convert`, { method: "POST" });
      toast({ title: "Lead convertido com sucesso!" });
      loadData();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao converter lead", variant: "destructive" });
    } finally {
      setConvertingId(null);
    }
  }

  async function startConversation(leadId: string) {
    setStartingConvLeadId(leadId);
    try {
      await api(`/api/v1/campaigns/${id}/leads/${leadId}/start-conversation`, { method: "POST" });
      toast({ title: "Conversa iniciada com sucesso!" });
      loadData();
      loadConversations();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao iniciar conversa", variant: "destructive" });
    } finally {
      setStartingConvLeadId(null);
    }
  }

  async function startOutreach() {
    setOutreachRunning(true);
    setOutreachDialogOpen(false);
    try {
      const result = await api<{ queued: number; message: string }>(
        `/api/v1/campaigns/${id}/start-outreach`,
        { method: "POST", body: JSON.stringify({ delay_seconds: 15 }) }
      );
      toast({ title: "Outreach iniciado!", description: result.message });
      // Trocar para tab de conversas
      setActiveTab("conversas");
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao iniciar outreach", variant: "destructive" });
    } finally {
      setOutreachRunning(false);
    }
  }

  /* ── Render ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) return null;

  const config = campaign.config_json || {};
  const statusInfo = statusLabels[campaign.status] || statusLabels.draft;

  const foundLeadsCount = leads.filter((l) => l.status === "found" && l.phone).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/campanhas")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-muted-foreground text-sm">{campaign.description || "Sem descrição"}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tipo</p>
            <p className="text-lg font-semibold capitalize">{campaign.type.replace("_", " ")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Leads Encontrados</p>
            <p className="text-lg font-semibold">{leads.length}</p>
          </CardContent>
        </Card>
        {typeof config.city === "string" && config.city && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Cidade</p>
              <p className="text-lg font-semibold flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {config.city}{typeof config.state === "string" && config.state ? `, ${config.state}` : ""}
              </p>
            </CardContent>
          </Card>
        )}
        {typeof config.activity === "string" && config.activity && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Atividade</p>
              <p className="text-lg font-semibold">{config.activity}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Botão executar prospecção */}
      {campaign.type === "prospecting" && (
        <div className="flex items-center gap-4">
          <Button onClick={runProspecting} disabled={running}>
            {running ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {running ? "Buscando leads..." : "Executar Prospecção"}
          </Button>
          {prospectResult && (
            <p className="text-sm text-muted-foreground">{prospectResult}</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="leads">
            <UserPlus className="h-4 w-4 mr-2" />
            Leads Encontrados ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="conversas">
            <MessageSquare className="h-4 w-4 mr-2" />
            Conversas IA ({conversations.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══════ Tab: Leads Encontrados ═══════ */}
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Leads Encontrados ({leads.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {leads.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Nenhum lead encontrado ainda. Execute a prospecção para buscar leads.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Negócio</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => {
                      const lStatus = leadStatusLabels[lead.status] || leadStatusLabels.found;
                      return (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{lead.business_name}</p>
                              {lead.address && <p className="text-xs text-muted-foreground">{lead.address}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lead.phone ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" /> {lead.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{lead.city || "-"}{lead.state ? `, ${lead.state}` : ""}</TableCell>
                          <TableCell className="text-sm">{lead.category || "-"}</TableCell>
                          <TableCell>
                            {lead.rating ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Star className="h-3 w-3 text-yellow-400" /> {lead.rating.toFixed(1)}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${lStatus.color}`}>
                              {lStatus.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {lead.status === "found" && lead.phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startConversation(lead.id)}
                                  disabled={startingConvLeadId === lead.id}
                                >
                                  {startingConvLeadId === lead.id ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3 mr-1" />
                                  )}
                                  Iniciar Conversa
                                </Button>
                              )}
                              {lead.status === "converted" ? (
                                <span className="flex items-center gap-1 text-xs text-green-400">
                                  <Check className="h-3 w-3" /> Convertido
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => convertLead(lead.id)}
                                  disabled={convertingId === lead.id}
                                >
                                  {convertingId === lead.id ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <UserPlus className="h-3 w-3 mr-1" />
                                  )}
                                  Converter
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════ Tab: Conversas IA ═══════ */}
        <TabsContent value="conversas">
          <div className="space-y-4">
            {/* Botão outreach em lote */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setOutreachDialogOpen(true)}
                disabled={outreachRunning || foundLeadsCount === 0}
              >
                {outreachRunning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {outreachRunning ? "Iniciando outreach..." : `Iniciar Outreach em Lote (${foundLeadsCount} leads)`}
              </Button>
              <p className="text-sm text-muted-foreground">
                {conversations.length > 0
                  ? `${conversations.length} conversa(s) ativa(s)`
                  : "Nenhuma conversa iniciada"}
              </p>
            </div>

            {/* Lista de conversas */}
            {conversations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma conversa de outreach iniciada. Clique em &quot;Iniciar Outreach em Lote&quot; ou
                    inicie conversas individuais na aba de Leads.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => {
                  const isExpanded = expandedConvId === conv.id;
                  const convStatus = convStatusLabels[conv.status] || convStatusLabels.active;
                  return (
                    <Card key={conv.id} className="overflow-hidden">
                      {/* Header da conversa */}
                      <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedConvId(isExpanded ? null : conv.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Bot className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{conv.business_name || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <Phone className="h-3 w-3" /> {conv.phone || "-"}
                              <span>|</span>
                              {conv.message_count} msg(s)
                              {conv.started_at && (
                                <>
                                  <span>|</span>
                                  {new Date(conv.started_at).toLocaleString("pt-BR")}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {conv.interest_detected && (
                            <Badge variant="default" className="bg-green-600/20 text-green-400 text-xs">
                              Interesse detectado
                            </Badge>
                          )}
                          <Badge variant={convStatus.variant} className="text-xs">
                            {convStatus.label}
                          </Badge>
                          {conv.lead_status === "converted" && (
                            <Badge variant="outline" className="border-emerald-500 text-emerald-400 text-xs">
                              Lead Convertido
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Chat expandível */}
                      {isExpanded && (
                        <div className="border-t">
                          <div className="max-h-96 overflow-y-auto p-4 space-y-3 bg-muted/30">
                            {conv.messages.length === 0 ? (
                              <p className="text-center text-muted-foreground text-sm py-4">
                                Nenhuma mensagem ainda.
                              </p>
                            ) : (
                              conv.messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`flex ${msg.role === "agent" ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                                      msg.role === "agent"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background border"
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 ${
                                      msg.role === "agent" ? "text-primary-foreground/60" : "text-muted-foreground"
                                    }`}>
                                      {msg.role === "agent" ? "Agente IA" : "Lead"}
                                      {msg.created_at && ` · ${new Date(msg.created_at).toLocaleString("pt-BR")}`}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={chatEndRef} />
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog confirmação outreach em lote */}
      <AlertDialog open={outreachDialogOpen} onOpenChange={setOutreachDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar Outreach em Lote</AlertDialogTitle>
            <AlertDialogDescription>
              O agente de IA irá iniciar conversas com <strong>{foundLeadsCount}</strong> lead(s) encontrado(s)
              que ainda não foram contatados. As mensagens serão enviadas com intervalo de 15 segundos para evitar
              bloqueio do número.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={startOutreach}>
              <Zap className="h-4 w-4 mr-2" />
              Iniciar Outreach
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
