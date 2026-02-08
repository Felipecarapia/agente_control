"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Save, Loader2, Trash2,
  User, Building2, Mail, Phone, Globe, MapPin,
  Flame, Target, TrendingUp, Megaphone, StickyNote,
  Calendar, DollarSign,
} from "lucide-react";

type LeadForm = {
  nome: string;
  email: string;
  telefone: string;
  whatsapp: string;
  empresa: string;
  cargo: string;
  site: string;
  cidade: string;
  estado: string;
  temperatura: string;
  status: string;
  score: number;
  origem: string;
  origem_detalhe: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  landing_page: string;
  referrer: string;
  interesse: string;
  necessidade: string;
  orcamento_estimado: string;
  proxima_acao: string;
  proxima_acao_data: string;
  motivo_perda: string;
  observacoes: string;
};

const emptyForm: LeadForm = {
  nome: "", email: "", telefone: "", whatsapp: "", empresa: "", cargo: "",
  site: "", cidade: "", estado: "", temperatura: "frio", status: "novo",
  score: 0, origem: "", origem_detalhe: "", utm_source: "", utm_medium: "",
  utm_campaign: "", utm_term: "", utm_content: "", landing_page: "", referrer: "",
  interesse: "", necessidade: "", orcamento_estimado: "", proxima_acao: "",
  proxima_acao_data: "", motivo_perda: "", observacoes: "",
};

const TEMP_OPTIONS = [
  { value: "frio", label: "❄️ Frio", desc: "Primeiro contato, sem interesse claro" },
  { value: "morno", label: "☀️ Morno", desc: "Demonstrou interesse, possível oportunidade" },
  { value: "quente", label: "🔥 Quente", desc: "Alta intenção de compra" },
  { value: "cliente", label: "🏆 Cliente", desc: "Já é cliente, possível upsell" },
];

const STATUS_OPTIONS = [
  { value: "novo", label: "Novo" },
  { value: "contatado", label: "Contatado" },
  { value: "qualificado", label: "Qualificado" },
  { value: "proposta_enviada", label: "Proposta Enviada" },
  { value: "negociando", label: "Negociando" },
  { value: "ganho", label: "Ganho" },
  { value: "perdido", label: "Perdido" },
];

const ORIGEM_OPTIONS = [
  { value: "site", label: "Site" },
  { value: "indicacao", label: "Indicação" },
  { value: "google_ads", label: "Google Ads" },
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "evento", label: "Evento" },
  { value: "cold_call", label: "Cold Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "outro", label: "Outro" },
];

export default function EditarLeadPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const isNew = isNaN(id) || !id;
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    
    async function loadLead() {
      setLoading(true);
      setLoadErr(null);
      try {
        const data = await api<Record<string, unknown>>(`/api/v1/leads/${id}`);
        // apiClient já extrai data do formato {ok: true, data: {...}}
        setForm({
          nome: (data.nome as string) || "",
          email: (data.email as string) || "",
          telefone: (data.telefone as string) || "",
          whatsapp: (data.whatsapp as string) || "",
          empresa: (data.empresa as string) || "",
          cargo: (data.cargo as string) || "",
          site: (data.site as string) || "",
          cidade: (data.cidade as string) || "",
          estado: (data.estado as string) || "",
          temperatura: (data.temperatura as string) || "frio",
          status: (data.status as string) || "novo",
          score: (data.score as number) || 0,
          origem: (data.origem as string) || "",
          origem_detalhe: (data.origem_detalhe as string) || "",
          utm_source: (data.utm_source as string) || "",
          utm_medium: (data.utm_medium as string) || "",
          utm_campaign: (data.utm_campaign as string) || "",
          utm_term: (data.utm_term as string) || "",
          utm_content: (data.utm_content as string) || "",
          landing_page: (data.landing_page as string) || "",
          referrer: (data.referrer as string) || "",
          interesse: (data.interesse as string) || "",
          necessidade: (data.necessidade as string) || "",
          orcamento_estimado: data.orcamento_estimado ? String(data.orcamento_estimado) : "",
          proxima_acao: (data.proxima_acao as string) || "",
          proxima_acao_data: data.proxima_acao_data ? (data.proxima_acao_data as string).slice(0, 16) : "",
          motivo_perda: (data.motivo_perda as string) || "",
          observacoes: (data.observacoes as string) || "",
        });
      } catch (err: any) {
        const errorCode = err?.code || "UNKNOWN";
        const errorMsg = err?.message || "Erro ao carregar lead";
        
        if (errorCode === "LEAD_NOT_FOUND") {
          setLoadErr("Lead não encontrado");
        } else {
          setLoadErr(errorMsg);
        }
      } finally {
        setLoading(false);
      }
    }
    
    loadLead();
  }, [id, isNew]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        score: form.score || 0,
        orcamento_estimado: form.orcamento_estimado ? parseFloat(form.orcamento_estimado) : null,
        proxima_acao_data: form.proxima_acao_data || null,
        origem: form.origem || null,
        origem_detalhe: form.origem_detalhe || null,
      };
      // Limpar strings vazias para null
      for (const key of Object.keys(payload)) {
        if (payload[key] === "") payload[key] = null;
      }
      payload.nome = form.nome; // nome é obrigatório, não pode ser null
      payload.temperatura = form.temperatura;
      payload.status = form.status;

      if (isNew) {
        await api("/api/v1/leads", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await api(`/api/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      router.push("/dashboard/leads");
      router.refresh();
    } catch (err: any) {
      const errorCode = err?.code || "UNKNOWN";
      const errorMsg = err?.message || "Erro ao salvar lead";
      const errorDetails = err?.details;
      
      // Tratar erros específicos
      if (errorCode === "VALIDATION_ERROR" && errorDetails) {
        // Mostrar erros de validação
        const validationErrors = errorDetails.map((d: any) => `${d.loc?.join(".")}: ${d.msg}`).join(", ");
        alert(`Erro de validação: ${validationErrors}`);
      } else if (errorCode === "LEAD_DUPLICATE") {
        alert(`Lead duplicado: ${errorMsg}`);
      } else if (errorCode === "LEAD_NOT_FOUND") {
        alert("Lead não encontrado");
      } else {
        alert(`Erro ao salvar: ${errorMsg}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    try {
      await api(`/api/v1/leads/${id}`, { method: "DELETE" });
      router.push("/dashboard/leads");
      router.refresh();
    } catch (err: any) {
      const errorCode = err?.code || "UNKNOWN";
      const errorMsg = err?.message || "Erro ao deletar lead";
      
      if (errorCode === "LEAD_NOT_FOUND") {
        alert("Lead não encontrado");
      } else {
        alert(`Erro ao deletar: ${errorMsg}`);
      }
    }
  }

  function u(field: keyof LeadForm, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Carregando...</div>;
  if (loadErr) return (
    <div className="space-y-4">
      <Button variant="ghost" size="icon" asChild><Link href="/dashboard/leads"><ArrowLeft className="h-4 w-4" /></Link></Button>
      <p className="text-destructive">{loadErr}</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/leads"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{isNew ? "Novo Lead" : form.nome || "Editar Lead"}</h1>
            <p className="text-muted-foreground text-sm">{isNew ? "Cadastre um novo lead" : "Edite as informações do lead"}</p>
          </div>
        </div>
        {!isNew && (
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        )}
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Dados Básicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" />
              Dados do Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => u("nome", e.target.value)} placeholder="Nome completo" required />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Empresa</Label>
                <Input value={form.empresa} onChange={(e) => u("empresa", e.target.value)} placeholder="Nome da empresa" />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</Label>
                <Input type="email" value={form.email} onChange={(e) => u("email", e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="grid gap-2">
                <Label>Cargo</Label>
                <Input value={form.cargo} onChange={(e) => u("cargo", e.target.value)} placeholder="Ex: Diretor de Marketing" />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Telefone</Label>
                <Input value={form.telefone} onChange={(e) => u("telefone", e.target.value)} placeholder="(00) 0000-0000" />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => u("whatsapp", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Site</Label>
                <Input value={form.site} onChange={(e) => u("site", e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Cidade</Label>
                <Input value={form.cidade} onChange={(e) => u("cidade", e.target.value)} placeholder="Cidade" />
              </div>
              <div className="grid gap-2 max-w-[120px]">
                <Label>UF</Label>
                <Input value={form.estado} onChange={(e) => u("estado", e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" maxLength={2} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classificação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-4 w-4 text-primary" />
              Classificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label>Temperatura</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TEMP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => u("temperatura", opt.value)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      form.temperatura === opt.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-muted hover:border-primary/30"
                    }`}
                  >
                    <div className="text-lg mb-1">{opt.label}</div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => u("status", e.target.value)}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Score (0-100)</Label>
                <Input type="number" min={0} max={100} value={form.score} onChange={(e) => u("score", parseInt(e.target.value) || 0)} />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" />Orçamento estimado</Label>
                <Input value={form.orcamento_estimado} onChange={(e) => u("orcamento_estimado", e.target.value)} placeholder="R$ 0,00" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Origem e Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Origem e Rastreamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5" />Origem</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.origem}
                  onChange={(e) => u("origem", e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {ORIGEM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Detalhe da origem</Label>
                <Input value={form.origem_detalhe} onChange={(e) => u("origem_detalhe", e.target.value)} placeholder="Ex: Campanha Black Friday, indicação do João..." />
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
              <Label className="text-xs font-medium text-muted-foreground">UTM Parameters (preenchido automaticamente se vier de campanha)</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">utm_source</Label>
                  <Input className="h-8 text-xs" value={form.utm_source} onChange={(e) => u("utm_source", e.target.value)} placeholder="google" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">utm_medium</Label>
                  <Input className="h-8 text-xs" value={form.utm_medium} onChange={(e) => u("utm_medium", e.target.value)} placeholder="cpc" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">utm_campaign</Label>
                  <Input className="h-8 text-xs" value={form.utm_campaign} onChange={(e) => u("utm_campaign", e.target.value)} placeholder="black-friday-2026" />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">utm_term</Label>
                  <Input className="h-8 text-xs" value={form.utm_term} onChange={(e) => u("utm_term", e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">utm_content</Label>
                  <Input className="h-8 text-xs" value={form.utm_content} onChange={(e) => u("utm_content", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Landing Page</Label>
                  <Input className="h-8 text-xs" value={form.landing_page} onChange={(e) => u("landing_page", e.target.value)} placeholder="https://..." />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Referrer</Label>
                  <Input className="h-8 text-xs" value={form.referrer} onChange={(e) => u("referrer", e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interesse e Necessidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-primary" />
              Interesse e Acompanhamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Interesse</Label>
              <Textarea rows={2} value={form.interesse} onChange={(e) => u("interesse", e.target.value)} placeholder="No que o lead demonstrou interesse?" />
            </div>
            <div className="grid gap-2">
              <Label>Necessidade / Dor</Label>
              <Textarea rows={2} value={form.necessidade} onChange={(e) => u("necessidade", e.target.value)} placeholder="Qual o problema que o lead quer resolver?" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Próxima ação</Label>
                <Input value={form.proxima_acao} onChange={(e) => u("proxima_acao", e.target.value)} placeholder="Ex: Ligar para apresentar proposta" />
              </div>
              <div className="grid gap-2">
                <Label>Data da próxima ação</Label>
                <Input type="datetime-local" value={form.proxima_acao_data} onChange={(e) => u("proxima_acao_data", e.target.value)} />
              </div>
            </div>
            {form.status === "perdido" && (
              <div className="grid gap-2">
                <Label className="text-red-500">Motivo da perda</Label>
                <Textarea rows={2} value={form.motivo_perda} onChange={(e) => u("motivo_perda", e.target.value)} placeholder="Por que o lead foi perdido?" />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Observações gerais</Label>
              <Textarea rows={3} value={form.observacoes} onChange={(e) => u("observacoes", e.target.value)} placeholder="Anotações sobre o lead..." />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/leads">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving} className="gap-2 min-w-[140px]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isNew ? "Criar Lead" : "Salvar"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
