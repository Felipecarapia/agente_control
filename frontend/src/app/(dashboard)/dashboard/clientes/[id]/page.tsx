"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, UserCircle, Users, FileText, ListTodo, DollarSign,
  Rocket, MessageCircle, Phone, Building2, Globe, Instagram,
  Facebook, Linkedin, Twitter, Youtube, Plus, Trash2, Save,
  User, Mail, Briefcase, StickyNote, CheckCircle2, Loader2,
  Upload, Image, CalendarCheck, Brain, X, FileIcon, Check,
  Circle, Target, Lightbulb, ChevronDown, ChevronRight,
} from "lucide-react";

type Cliente = {
  id: number;
  tipo: string;
  nome: string;
  razao_social: string | null;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  inscricao_estadual: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
};

const emptyForm = {
  tipo: "pf" as "pf" | "pj",
  nome: "",
  razao_social: "",
  cpf: "",
  cnpj: "",
  rg: "",
  inscricao_estadual: "",
  email: "",
  telefone: "",
  celular: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id || isNaN(id)) return;
    api<Cliente>(`/api/v1/clientes/${id}`)
      .then((c) => {
        setForm({
          tipo: (c.tipo || "pf") as "pf" | "pj",
          nome: c.nome || "",
          razao_social: c.razao_social || "",
          cpf: c.cpf || "",
          cnpj: c.cnpj || "",
          rg: c.rg || "",
          inscricao_estadual: c.inscricao_estadual || "",
          email: c.email || "",
          telefone: c.telefone || "",
          celular: c.celular || "",
          cep: c.cep || "",
          endereco: c.endereco || "",
          numero: c.numero || "",
          complemento: c.complemento || "",
          bairro: c.bairro || "",
          cidade: c.cidade || "",
          estado: c.estado || "",
        });
      })
      .catch((e) => setLoadErr(e instanceof Error ? e.message : "Erro ao carregar"));
  }, [id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || isNaN(id)) return;
    setLoading(true);
    try {
      await api(`/api/v1/clientes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          tipo: form.tipo,
          nome: form.nome,
          razao_social: form.tipo === "pj" ? form.razao_social || null : null,
          cpf: form.tipo === "pf" ? form.cpf || null : null,
          cnpj: form.tipo === "pj" ? form.cnpj || null : null,
          rg: form.tipo === "pf" ? form.rg || null : null,
          inscricao_estadual: form.tipo === "pj" ? form.inscricao_estadual || null : null,
          email: form.email || null,
          telefone: form.telefone || null,
          celular: form.celular || null,
          cep: form.cep || null,
          endereco: form.endereco || null,
          numero: form.numero || null,
          complemento: form.complemento || null,
          bairro: form.bairro || null,
          cidade: form.cidade || null,
          estado: form.estado || null,
        }),
      });
      router.push("/dashboard/clientes");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const isPj = form.tipo === "pj";

  if (loadErr) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-destructive">{loadErr}</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cliente: {form.nome || "..."}</h1>
          <p className="text-muted-foreground">Cadastro e informações do cliente</p>
        </div>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dados" className="gap-2">
            <UserCircle className="h-4 w-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-2">
            <Rocket className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="time" className="gap-2">
            <Users className="h-4 w-4" />
            Time
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="tarefas" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <form onSubmit={submit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados do cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label>Tipo</Label>
                  <select
                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as "pf" | "pj" }))}
                  >
                    <option value="pf">Pessoa física</option>
                    <option value="pj">Pessoa jurídica</option>
                  </select>
                </div>

                {isPj ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="razao_social">Razão social</Label>
                      <Input id="razao_social" value={form.razao_social} onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome fantasia</Label>
                      <Input id="nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input id="cnpj" value={form.cnpj} onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="inscricao_estadual">Inscrição estadual</Label>
                        <Input id="inscricao_estadual" value={form.inscricao_estadual} onChange={(e) => setForm((f) => ({ ...f, inscricao_estadual: e.target.value }))} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input id="nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input id="cpf" value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="rg">RG</Label>
                        <Input id="rg" value={form.rg} onChange={(e) => setForm((f) => ({ ...f, rg: e.target.value }))} />
                      </div>
                    </div>
                  </>
                )}

                <hr className="border-border" />
                <div className="text-sm font-medium text-muted-foreground">Contato</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 0000-0000" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="celular">Celular</Label>
                    <Input id="celular" value={form.celular} onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))} placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <hr className="border-border" />
                <div className="text-sm font-medium text-muted-foreground">Endereço</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input id="cep" value={form.cep} onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
                  </div>
                  <div className="md:col-span-2 grid gap-2">
                    <Label htmlFor="endereco">Logradouro</Label>
                    <Input id="endereco" value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input id="numero" value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" value={form.complemento} onChange={(e) => setForm((f) => ({ ...f, complemento: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} />
                  </div>
                  <div className="grid gap-2 max-w-[120px]">
                    <Label htmlFor="estado">Estado</Label>
                    <Input id="estado" value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="UF" maxLength={2} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-2 mt-6">
              <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/clientes">Cancelar</Link>
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="onboarding" className="mt-6">
          <OnboardingTab clienteId={id} />
        </TabsContent>

        <TabsContent value="time" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Time</CardTitle>
              <p className="text-sm text-muted-foreground">Equipe e contatos vinculados a este cliente.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve: gestão de membros do time do cliente.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <p className="text-sm text-muted-foreground">Documentos anexados ao cliente.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve: upload e listagem de documentos.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tarefas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas</CardTitle>
              <p className="text-sm text-muted-foreground">Tarefas relacionadas a este cliente.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve: listagem de tarefas por projeto vinculado ao cliente.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Financeiro</CardTitle>
              <p className="text-sm text-muted-foreground">Propostas, contratos e movimentação financeira.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve: resumo financeiro e histórico do cliente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Onboarding Tab Component
// ═══════════════════════════════════════════════════════════════

type OnboardingInfo = {
  quem_somos: string;
  o_que_vendemos: string;
  para_quem_vendemos: string;
  diferenciais: string;
  perguntas_frequentes: string;
  logo_url: string;
  fotos_urls: string;
  redes_sociais: string;
  conteudo_base_site: string;
  conteudo_reutilizavel_bot: string;
};

type MetaWhatsapp = {
  nome_aplicativo: string;
  numero_oficial: string;
  token_acesso: string;
  business_manager_id: string;
};

type ContatoOperacional = {
  id?: number;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  observacao: string;
};

type RedesSociais = {
  instagram: string;
  facebook: string;
  linkedin: string;
  twitter: string;
  youtube: string;
  site: string;
};

const emptyOnboarding: OnboardingInfo = {
  quem_somos: "",
  o_que_vendemos: "",
  para_quem_vendemos: "",
  diferenciais: "",
  perguntas_frequentes: "",
  logo_url: "",
  fotos_urls: "",
  redes_sociais: "",
  conteudo_base_site: "",
  conteudo_reutilizavel_bot: "",
};

const emptyWhatsapp: MetaWhatsapp = {
  nome_aplicativo: "",
  numero_oficial: "",
  token_acesso: "",
  business_manager_id: "",
};

const emptyContato: ContatoOperacional = {
  nome: "",
  cargo: "",
  email: "",
  telefone: "",
  observacao: "",
};

const emptyRedes: RedesSociais = {
  instagram: "",
  facebook: "",
  linkedin: "",
  twitter: "",
  youtube: "",
  site: "",
};

// ─── Tipos para Docs, Imagens, Cronograma ────────────────
type DocumentoRAG = {
  id: number;
  nome_original: string;
  url: string;
  content_type: string | null;
  tamanho_bytes: number | null;
  created_at: string | null;
};

type ImagemCliente = {
  id: number;
  nome_original: string;
  url: string;
  content_type: string | null;
  tamanho_bytes: number | null;
  descricao: string | null;
  created_at: string | null;
};

type CronogramaItem = {
  id: number;
  etapa_id: number;
  ordem: number;
  texto: string;
  concluido: boolean;
  categoria: string | null;
};

type CronogramaEtapa = {
  id: number;
  cliente_id: number;
  ordem: number;
  titulo: string;
  descricao: string | null;
  cor: string | null;
  itens: CronogramaItem[];
};

const COR_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string; ring: string }> = {
  red:     { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-500", badge: "bg-red-500", ring: "ring-red-500/20" },
  orange:  { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", badge: "bg-orange-500", ring: "ring-orange-500/20" },
  amber:   { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500", badge: "bg-amber-500", ring: "ring-amber-500/20" },
  green:   { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-500", badge: "bg-green-500", ring: "ring-green-500/20" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-500", badge: "bg-emerald-500", ring: "ring-emerald-500/20" },
  blue:    { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500", badge: "bg-blue-500", ring: "ring-blue-500/20" },
  cyan:    { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-500", badge: "bg-cyan-500", ring: "ring-cyan-500/20" },
  purple:  { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-500", badge: "bg-purple-500", ring: "ring-purple-500/20" },
  slate:   { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-500", badge: "bg-slate-500", ring: "ring-slate-500/20" },
};

const CATEGORIA_ICONS: Record<string, typeof Circle> = {
  "ação": Target,
  "decisão": Lightbulb,
  "resultado": CheckCircle2,
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function OnboardingTab({ clienteId }: { clienteId: number }) {
  const [subTab, setSubTab] = useState<"info" | "whatsapp" | "contatos" | "docs_rag" | "imagens" | "cronograma">("info");
  const [onboarding, setOnboarding] = useState<OnboardingInfo>(emptyOnboarding);
  const [redes, setRedes] = useState<RedesSociais>(emptyRedes);
  const [whatsapp, setWhatsapp] = useState<MetaWhatsapp>(emptyWhatsapp);
  const [contatos, setContatos] = useState<ContatoOperacional[]>([]);
  const [docs, setDocs] = useState<DocumentoRAG[]>([]);
  const [imagens, setImagens] = useState<ImagemCliente[]>([]);
  const [etapas, setEtapas] = useState<CronogramaEtapa[]>([]);
  const [expandedEtapas, setExpandedEtapas] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const showSaved = (msg: string) => {
    setSaved(msg);
    setTimeout(() => setSaved(null), 3000);
  };

  const toggleEtapaExpanded = (id: number) => {
    setExpandedEtapas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Fetch data ──────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    try {
      const data = await api<DocumentoRAG[]>(`/api/v1/clientes/${clienteId}/documentos-rag`);
      setDocs(data);
    } catch { /* ok */ }
  }, [clienteId]);

  const fetchImagens = useCallback(async () => {
    try {
      const data = await api<ImagemCliente[]>(`/api/v1/clientes/${clienteId}/imagens`);
      setImagens(data);
    } catch { /* ok */ }
  }, [clienteId]);

  const fetchCronograma = useCallback(async () => {
    try {
      const data = await api<CronogramaEtapa[]>(`/api/v1/clientes/${clienteId}/cronograma`);
      setEtapas(data);
      // Expandir todas por padrão
      setExpandedEtapas(new Set(data.map((e) => e.id)));
    } catch { /* ok */ }
  }, [clienteId]);

  const fetchOnboarding = useCallback(async () => {
    try {
      const data = await api<OnboardingInfo | null>(`/api/v1/clientes/${clienteId}/onboarding/info`);
      if (data) {
        setOnboarding(data);
        try {
          const parsed = data.redes_sociais ? JSON.parse(data.redes_sociais) : {};
          setRedes({ ...emptyRedes, ...parsed });
        } catch {
          setRedes(emptyRedes);
        }
      }
    } catch { /* primeira vez, ainda não existe */ }
  }, [clienteId]);

  const fetchWhatsapp = useCallback(async () => {
    try {
      const data = await api<MetaWhatsapp | null>(`/api/v1/clientes/${clienteId}/onboarding/whatsapp`);
      if (data) setWhatsapp(data);
    } catch { /* ok */ }
  }, [clienteId]);

  const fetchContatos = useCallback(async () => {
    try {
      const data = await api<ContatoOperacional[]>(`/api/v1/clientes/${clienteId}/onboarding/contatos`);
      setContatos(data);
    } catch { /* ok */ }
  }, [clienteId]);

  useEffect(() => {
    if (!clienteId || isNaN(clienteId)) return;
    fetchOnboarding();
    fetchWhatsapp();
    fetchContatos();
    fetchDocs();
    fetchImagens();
    fetchCronograma();
  }, [clienteId, fetchOnboarding, fetchWhatsapp, fetchContatos, fetchDocs, fetchImagens, fetchCronograma]);

  // ─── Save handlers ───────────────────────────────────────
  async function saveOnboarding() {
    setSaving(true);
    try {
      const payload = {
        ...onboarding,
        redes_sociais: JSON.stringify(redes),
      };
      await api(`/api/v1/clientes/${clienteId}/onboarding/info`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showSaved("Informações salvas!");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function saveWhatsapp() {
    setSaving(true);
    try {
      await api(`/api/v1/clientes/${clienteId}/onboarding/whatsapp`, {
        method: "PUT",
        body: JSON.stringify(whatsapp),
      });
      showSaved("WhatsApp salvo!");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function addContato() {
    setSaving(true);
    try {
      await api(`/api/v1/clientes/${clienteId}/onboarding/contatos`, {
        method: "POST",
        body: JSON.stringify(emptyContato),
      });
      await fetchContatos();
      showSaved("Contato adicionado!");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function saveContato(contato: ContatoOperacional) {
    if (!contato.id) return;
    setSaving(true);
    try {
      await api(`/api/v1/clientes/${clienteId}/onboarding/contatos/${contato.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nome: contato.nome,
          cargo: contato.cargo,
          email: contato.email,
          telefone: contato.telefone,
          observacao: contato.observacao,
        }),
      });
      showSaved("Contato salvo!");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteContato(contatoId: number) {
    setSaving(true);
    try {
      await api(`/api/v1/clientes/${clienteId}/onboarding/contatos/${contatoId}`, {
        method: "DELETE",
      });
      setContatos((prev) => prev.filter((c) => c.id !== contatoId));
      showSaved("Contato removido!");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function updateContato(index: number, field: keyof ContatoOperacional, value: string) {
    setContatos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  // ─── Docs RAG handlers ─────────────────────────────────
  async function uploadDocRAG(file: File) {
    setUploading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const formData = new FormData();
      formData.append("file", file);
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/v1/clientes/${clienteId}/documentos-rag/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error("Erro no upload");
      await fetchDocs();
      showSaved("Documento enviado!");
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function deleteDoc(docId: number) {
    try {
      await api(`/api/v1/clientes/${clienteId}/documentos-rag/${docId}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      showSaved("Documento removido!");
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Imagens handlers ──────────────────────────────────
  async function uploadImagem(file: File) {
    setUploading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const formData = new FormData();
      formData.append("file", file);
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/v1/clientes/${clienteId}/imagens/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error("Erro no upload");
      await fetchImagens();
      showSaved("Imagem enviada!");
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function deleteImagem(imgId: number) {
    try {
      await api(`/api/v1/clientes/${clienteId}/imagens/${imgId}`, { method: "DELETE" });
      setImagens((prev) => prev.filter((i) => i.id !== imgId));
      showSaved("Imagem removida!");
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Cronograma handlers ───────────────────────────────
  async function inicializarCronograma() {
    setSaving(true);
    try {
      await api(`/api/v1/clientes/${clienteId}/cronograma/inicializar`, { method: "POST" });
      await fetchCronograma();
      showSaved("Cronograma inicializado!");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(itemId: number, concluido: boolean) {
    try {
      await api(`/api/v1/clientes/${clienteId}/cronograma/itens/${itemId}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ concluido }),
      });
      setEtapas((prev) =>
        prev.map((etapa) => ({
          ...etapa,
          itens: etapa.itens.map((item) =>
            item.id === itemId ? { ...item, concluido } : item
          ),
        }))
      );
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Sub-tab buttons ────────────────────────────────────
  const subTabs = [
    { id: "info" as const, label: "Informações", icon: Globe },
    { id: "whatsapp" as const, label: "Meta WhatsApp", icon: MessageCircle },
    { id: "contatos" as const, label: "Contatos Operacionais", icon: Users },
    { id: "docs_rag" as const, label: "Docs RAG", icon: Brain },
    { id: "imagens" as const, label: "Imagens", icon: Image },
    { id: "cronograma" as const, label: "Cronograma", icon: CalendarCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Notificação de salvamento */}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          {saved}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              subTab === tab.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────── Informações para Landing Page ────── */}
      {subTab === "info" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Informações para Landing Page
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Dados sobre a empresa do cliente para montar a landing page e alimentar o bot
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label>Quem Somos <span className="text-xs text-muted-foreground">(linguagem real da empresa)</span></Label>
                <Textarea
                  rows={4}
                  value={onboarding.quem_somos}
                  onChange={(e) => setOnboarding((f) => ({ ...f, quem_somos: e.target.value }))}
                  placeholder="Descreva quem é a empresa, sua história, missão e valores..."
                />
              </div>
              <div className="grid gap-2">
                <Label>O que vendemos</Label>
                <Textarea
                  rows={3}
                  value={onboarding.o_que_vendemos}
                  onChange={(e) => setOnboarding((f) => ({ ...f, o_que_vendemos: e.target.value }))}
                  placeholder="Descreva os produtos e serviços oferecidos..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Para quem vendemos</Label>
                <Textarea
                  rows={3}
                  value={onboarding.para_quem_vendemos}
                  onChange={(e) => setOnboarding((f) => ({ ...f, para_quem_vendemos: e.target.value }))}
                  placeholder="Descreva o público-alvo, persona ideal..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Diferenciais reais</Label>
                <Textarea
                  rows={3}
                  value={onboarding.diferenciais}
                  onChange={(e) => setOnboarding((f) => ({ ...f, diferenciais: e.target.value }))}
                  placeholder="O que diferencia esta empresa das demais..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Perguntas frequentes</Label>
                <Textarea
                  rows={4}
                  value={onboarding.perguntas_frequentes}
                  onChange={(e) => setOnboarding((f) => ({ ...f, perguntas_frequentes: e.target.value }))}
                  placeholder="Quais são as dúvidas mais comuns dos clientes? (uma por linha)"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Materiais
              </CardTitle>
              <p className="text-sm text-muted-foreground">Logo, fotos e redes sociais do cliente</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label>URL do Logo</Label>
                <Input
                  value={onboarding.logo_url}
                  onChange={(e) => setOnboarding((f) => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label>URLs das Fotos reais <span className="text-xs text-muted-foreground">(uma URL por linha)</span></Label>
                <Textarea
                  rows={3}
                  value={onboarding.fotos_urls}
                  onChange={(e) => setOnboarding((f) => ({ ...f, fotos_urls: e.target.value }))}
                  placeholder="https://foto1.jpg&#10;https://foto2.jpg"
                />
              </div>

              <hr className="border-border" />
              <div className="text-sm font-medium text-muted-foreground">Redes Sociais</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2"><Instagram className="h-4 w-4 text-pink-500" /> Instagram</Label>
                  <Input
                    value={redes.instagram}
                    onChange={(e) => setRedes((f) => ({ ...f, instagram: e.target.value }))}
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2"><Facebook className="h-4 w-4 text-blue-600" /> Facebook</Label>
                  <Input
                    value={redes.facebook}
                    onChange={(e) => setRedes((f) => ({ ...f, facebook: e.target.value }))}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4 text-blue-500" /> LinkedIn</Label>
                  <Input
                    value={redes.linkedin}
                    onChange={(e) => setRedes((f) => ({ ...f, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2"><Twitter className="h-4 w-4" /> X (Twitter)</Label>
                  <Input
                    value={redes.twitter}
                    onChange={(e) => setRedes((f) => ({ ...f, twitter: e.target.value }))}
                    placeholder="https://x.com/..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2"><Youtube className="h-4 w-4 text-red-500" /> YouTube</Label>
                  <Input
                    value={redes.youtube}
                    onChange={(e) => setRedes((f) => ({ ...f, youtube: e.target.value }))}
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2"><Globe className="h-4 w-4 text-green-500" /> Site</Label>
                  <Input
                    value={redes.site}
                    onChange={(e) => setRedes((f) => ({ ...f, site: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Resultado Esperado
              </CardTitle>
              <p className="text-sm text-muted-foreground">Conteúdo base e reutilizável gerado a partir do onboarding</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label>Conteúdo base do site</Label>
                <Textarea
                  rows={4}
                  value={onboarding.conteudo_base_site}
                  onChange={(e) => setOnboarding((f) => ({ ...f, conteudo_base_site: e.target.value }))}
                  placeholder="Conteúdo estruturado para o site..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Conteúdo reutilizável para o bot</Label>
                <Textarea
                  rows={4}
                  value={onboarding.conteudo_reutilizavel_bot}
                  onChange={(e) => setOnboarding((f) => ({ ...f, conteudo_reutilizavel_bot: e.target.value }))}
                  placeholder="Informações que serão utilizadas pelo bot de IA..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveOnboarding} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Informações
            </Button>
          </div>
        </div>
      )}

      {/* ────── Meta WhatsApp Oficial ────── */}
      {subTab === "whatsapp" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                Meta WhatsApp Oficial
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configurações da API oficial do WhatsApp Business
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label>Nome do Aplicativo</Label>
                <Input
                  value={whatsapp.nome_aplicativo}
                  onChange={(e) => setWhatsapp((f) => ({ ...f, nome_aplicativo: e.target.value }))}
                  placeholder="Nome do app no Meta Business"
                />
              </div>
              <div className="grid gap-2">
                <Label>Número Oficial</Label>
                <Input
                  value={whatsapp.numero_oficial}
                  onChange={(e) => setWhatsapp((f) => ({ ...f, numero_oficial: e.target.value }))}
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div className="grid gap-2">
                <Label>Token de Acesso</Label>
                <Textarea
                  rows={3}
                  value={whatsapp.token_acesso}
                  onChange={(e) => setWhatsapp((f) => ({ ...f, token_acesso: e.target.value }))}
                  placeholder="EAAxxxxxxx..."
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid gap-2">
                <Label>ID do Business Manager</Label>
                <Input
                  value={whatsapp.business_manager_id}
                  onChange={(e) => setWhatsapp((f) => ({ ...f, business_manager_id: e.target.value }))}
                  placeholder="123456789012345"
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveWhatsapp} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar WhatsApp
            </Button>
          </div>
        </div>
      )}

      {/* ────── Contatos Operacionais ────── */}
      {subTab === "contatos" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Contatos Operacionais</h3>
              <p className="text-sm text-muted-foreground">Pessoas de contato do cliente para o dia-a-dia</p>
            </div>
            <Button onClick={addContato} disabled={saving} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Adicionar Contato
            </Button>
          </div>

          {contatos.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum contato operacional cadastrado.</p>
                <Button onClick={addContato} disabled={saving} className="gap-2 mt-4" variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                  Adicionar primeiro contato
                </Button>
              </CardContent>
            </Card>
          )}

          {contatos.map((contato, index) => (
            <Card key={contato.id ?? index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {contato.nome || `Contato ${index + 1}`}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveContato(contato)}
                      disabled={saving}
                      className="gap-1.5"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Salvar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => contato.id && deleteContato(contato.id)}
                      disabled={saving}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2 text-xs">
                      <User className="h-3.5 w-3.5" /> Nome
                    </Label>
                    <Input
                      value={contato.nome}
                      onChange={(e) => updateContato(index, "nome", e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2 text-xs">
                      <Briefcase className="h-3.5 w-3.5" /> Cargo
                    </Label>
                    <Input
                      value={contato.cargo}
                      onChange={(e) => updateContato(index, "cargo", e.target.value)}
                      placeholder="Ex: Gerente de Marketing"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Label>
                    <Input
                      type="email"
                      value={contato.email}
                      onChange={(e) => updateContato(index, "email", e.target.value)}
                      placeholder="email@empresa.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5" /> Telefone
                    </Label>
                    <Input
                      value={contato.telefone}
                      onChange={(e) => updateContato(index, "telefone", e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <StickyNote className="h-3.5 w-3.5" /> Observação
                  </Label>
                  <Textarea
                    rows={2}
                    value={contato.observacao}
                    onChange={(e) => updateContato(index, "observacao", e.target.value)}
                    placeholder="Observações sobre este contato..."
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ────── Documentos RAG ────── */}
      {subTab === "docs_rag" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Documentos para Treinamento do Bot (RAG)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDFs, DOCs, TXTs e outros documentos que serão usados para treinar o agente de IA
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.pptx,.md,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadDocRAG(file);
                      e.target.value = "";
                    }}
                  />
                  <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload Documento
                  </div>
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <div className="py-12 text-center">
                  <FileIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum documento enviado ainda.</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Envie PDFs, DOCs, TXTs para treinar o bot</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 rounded-xl border p-4 transition-all hover:bg-muted/50 group"
                    >
                      <div className="shrink-0 h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <FileIcon className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline truncate block"
                        >
                          {doc.nome_original}
                        </a>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{formatBytes(doc.tamanho_bytes)}</span>
                          {doc.content_type && <span>{doc.content_type.split("/").pop()?.toUpperCase()}</span>}
                          {doc.created_at && <span>{new Date(doc.created_at).toLocaleDateString("pt-BR")}</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDoc(doc.id)}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ────── Imagens Gerais ────── */}
      {subTab === "imagens" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5 text-blue-500" />
                    Imagens Gerais
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fotos, logos e imagens do cliente armazenadas no MinIO
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImagem(file);
                      e.target.value = "";
                    }}
                  />
                  <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload Imagem
                  </div>
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {imagens.length === 0 ? (
                <div className="py-12 text-center">
                  <Image className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhuma imagem enviada ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imagens.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-xl overflow-hidden border bg-muted/30 aspect-square"
                    >
                      <img
                        src={img.url}
                        alt={img.nome_original}
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-end opacity-0 group-hover:opacity-100">
                        <div className="w-full p-3 flex items-center justify-between">
                          <div className="text-white text-xs truncate max-w-[70%]">
                            {img.nome_original}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteImagem(img.id)}
                            className="text-white hover:text-red-400 hover:bg-white/10 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">
                          {formatBytes(img.tamanho_bytes)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ────── Cronograma Operacional ────── */}
      {subTab === "cronograma" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Cronograma Operacional
              </h3>
              <p className="text-sm text-muted-foreground">
                Checklist completo de início do projeto
              </p>
            </div>
            {etapas.length === 0 && (
              <Button onClick={inicializarCronograma} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                Inicializar Cronograma
              </Button>
            )}
          </div>

          {etapas.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CalendarCheck className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">Cronograma não inicializado</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                  Clique no botão acima para criar o cronograma operacional completo com todas as etapas e itens de checklist pré-definidos.
                </p>
                <Button onClick={inicializarCronograma} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  Criar Cronograma Padrão
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Barra de progresso geral */}
              {(() => {
                const totalItens = etapas.reduce((acc, e) => acc + e.itens.length, 0);
                const totalConcluidos = etapas.reduce((acc, e) => acc + e.itens.filter((i) => i.concluido).length, 0);
                const percent = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
                return (
                  <Card>
                    <CardContent className="py-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Progresso Geral</span>
                        <span className="text-sm text-muted-foreground">
                          {totalConcluidos}/{totalItens} itens ({percent}%)
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Cards das etapas */}
              <div className="space-y-4">
                {etapas.map((etapa) => {
                  const cor = COR_CLASSES[etapa.cor || "blue"] || COR_CLASSES.blue;
                  const totalEtapa = etapa.itens.length;
                  const concluidosEtapa = etapa.itens.filter((i) => i.concluido).length;
                  const percentEtapa = totalEtapa > 0 ? Math.round((concluidosEtapa / totalEtapa) * 100) : 0;
                  const isExpanded = expandedEtapas.has(etapa.id);

                  return (
                    <div
                      key={etapa.id}
                      className={`rounded-xl border-2 ${cor.border} overflow-hidden transition-all`}
                    >
                      {/* Header do card */}
                      <button
                        type="button"
                        onClick={() => toggleEtapaExpanded(etapa.id)}
                        className={`w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-muted/30 ${cor.bg}`}
                      >
                        <div className={`shrink-0 h-10 w-10 rounded-xl ${cor.badge} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                          {etapa.ordem + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-sm md:text-base">{etapa.titulo}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${cor.bg} ${cor.text} font-medium`}>
                              {concluidosEtapa}/{totalEtapa}
                            </span>
                          </div>
                          {etapa.descricao && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{etapa.descricao}</p>
                          )}
                          {/* Mini progress bar */}
                          <div className="h-1.5 rounded-full bg-muted mt-2 w-full max-w-xs">
                            <div
                              className={`h-full rounded-full ${cor.badge} transition-all duration-500`}
                              style={{ width: `${percentEtapa}%` }}
                            />
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {/* Itens do checklist */}
                      {isExpanded && (
                        <div className="border-t px-5 py-4 space-y-2">
                          {etapa.itens.map((item) => {
                            const CatIcon = CATEGORIA_ICONS[item.categoria || "ação"] || Circle;
                            return (
                              <label
                                key={item.id}
                                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all group ${
                                  item.concluido
                                    ? "bg-muted/40 opacity-70"
                                    : "hover:bg-muted/50"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleItem(item.id, !item.concluido)}
                                  className={`shrink-0 mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                    item.concluido
                                      ? `${cor.badge} border-transparent`
                                      : `border-muted-foreground/30 hover:${cor.border}`
                                  }`}
                                >
                                  {item.concluido && <Check className="h-3.5 w-3.5 text-white" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm ${item.concluido ? "line-through text-muted-foreground" : ""}`}>
                                    {item.texto}
                                  </span>
                                </div>
                                <div className={`shrink-0 flex items-center gap-1.5 text-xs ${
                                  item.categoria === "resultado" ? "text-green-500" :
                                  item.categoria === "decisão" ? "text-amber-500" :
                                  "text-muted-foreground/60"
                                }`}>
                                  <CatIcon className="h-3 w-3" />
                                  <span className="hidden sm:inline capitalize">{item.categoria || "ação"}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
