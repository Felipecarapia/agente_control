"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, CheckCircle2, Sparkles, LayoutTemplate, Bot, MessageSquare, Briefcase } from "lucide-react";

type Cliente = { id: string; nome: string };
type Projeto = { id: string; nome: string; cliente_id: string };

const TEMPLATES = [
  {
    id: "ai_agent",
    icon: <Bot className="h-6 w-6 text-emerald-400" />,
    title: "Agente de Inteligência Artificial",
    description: "Proposta completa para implantação da Sofia Agent.",
    prefill: {
      titulo: "Implantação de Agente IA (Sofia)",
      descricao: "1. Setup do ambiente Multi-Tenant\\n2. Configuração do Prompt do Agente\\n3. Integração com WhatsApp via Evolution API\\n4. Treinamento de base de conhecimento\\n\\nPrazo de entrega: 7 dias úteis.\\nSuporte incluso por 30 dias.",
      valor: "4500",
    }
  },
  {
    id: "crm_setup",
    icon: <Briefcase className="h-6 w-6 text-blue-400" />,
    title: "Setup de CRM & Funil",
    description: "Estruturação de funis de vendas e cadastro de clientes.",
    prefill: {
      titulo: "Setup de CRM e Funil de Vendas",
      descricao: "1. Mapeamento da jornada do cliente\\n2. Criação de 3 funis personalizados\\n3. Treinamento da equipe de vendas\\n4. Importação de base de leads\\n\\nPrazo de entrega: 5 dias úteis.",
      valor: "2500",
    }
  },
  {
    id: "whatsapp_auto",
    icon: <MessageSquare className="h-6 w-6 text-green-400" />,
    title: "Automação de WhatsApp",
    description: "Fluxos de atendimento, disparo em massa e conectividade.",
    prefill: {
      titulo: "Automação de WhatsApp e Disparos",
      descricao: "1. Conexão de número via QR Code\\n2. Criação de fluxos de boas-vindas\\n3. Configuração de respostas rápidas\\n4. Sistema de disparo de campanhas\\n\\nPrazo de entrega: 3 dias úteis.",
      valor: "1800",
    }
  },
  {
    id: "custom",
    icon: <FileText className="h-6 w-6 text-foreground" />,
    title: "Proposta Personalizada",
    description: "Começar uma proposta em branco.",
    prefill: {
      titulo: "",
      descricao: "",
      valor: "",
    }
  }
];

const emptyForm = {
  titulo: "",
  descricao: "",
  valor: "",
  cliente_id: "",
  projeto_id: "",
  status: "rascunho",
  validade_ate: "",
};

export default function NovaPropostaPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Cliente[]>("/api/v1/clientes").catch(() => []),
      api<Projeto[]>("/api/v1/projetos").catch(() => []),
    ]).then(([c, p]) => {
      setClientes(Array.isArray(c) ? c : []);
      setProjetos(Array.isArray(p) ? p : []);
    }).catch(() => {
      setClientes([]); setProjetos([]);
    });
  }, []);

  const projetosDoCliente = form.cliente_id
    ? projetos.filter((p) => p.cliente_id === form.cliente_id)
    : projetos;

  function handleSelectTemplate(tpl: typeof TEMPLATES[0]) {
    setSelectedTemplate(tpl.id);
    setForm(f => ({
      ...f,
      titulo: tpl.prefill.titulo,
      descricao: tpl.prefill.descricao,
      valor: tpl.prefill.valor,
    }));
    // Scroll to form smoothly
    window.scrollTo({ top: 400, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_id) { alert("Selecione um cliente."); return; }
    setLoading(true);
    try {
      await api("/api/v1/propostas", {
        method: "POST",
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || null,
          valor: form.valor ? parseFloat(form.valor) : null,
          cliente_id: form.cliente_id,
          projeto_id: form.projeto_id || null,
          status: form.status,
          validade_ate: form.validade_ate || null,
        }),
      });
      router.push("/dashboard/propostas");
      router.refresh();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err?.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="hover:bg-muted/50 rounded-full h-10 w-10">
          <Link href="/dashboard/propostas">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Nova Proposta <Sparkles className="h-5 w-5 text-amber-500" />
          </h1>
          <p className="text-muted-foreground mt-1">Crie uma proposta irrecusável baseada nos nossos templates.</p>
        </div>
      </div>

      {/* Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Templates Prontos</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((tpl, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className={`relative overflow-hidden cursor-pointer rounded-2xl border p-5 transition-all duration-300 ${
                selectedTemplate === tpl.id 
                  ? "border-emerald-500 bg-emerald-500/5 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500" 
                  : "border-border/50 bg-card hover:border-foreground/30 hover:bg-muted/20"
              }`}
            >
              {selectedTemplate === tpl.id && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              )}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selectedTemplate === tpl.id ? "bg-emerald-500/10" : "bg-muted"}`}>
                {tpl.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{tpl.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Form Section */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.form 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            onSubmit={submit} 
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-tight">Detalhes da Proposta</h2>
            </div>
            
            <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden rounded-2xl">
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
              <CardContent className="p-8 grid gap-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="titulo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título da Proposta</Label>
                      <Input id="titulo" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required className="h-11 bg-background" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cliente" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente Alvo</Label>
                      <select
                        id="cliente"
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={form.cliente_id}
                        onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value, projeto_id: "" }))}
                        required
                      >
                        <option value="">Selecione um cliente...</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="valor" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor (R$)</Label>
                        <Input id="valor" type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="h-11 bg-background font-mono" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="validade" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Validade até</Label>
                        <Input id="validade" type="date" value={form.validade_ate} onChange={e => setForm(f => ({ ...f, validade_ate: e.target.value }))} className="h-11 bg-background" />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="space-y-2 h-full flex flex-col">
                      <Label htmlFor="descricao" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Escopo e Entregáveis</Label>
                      <Textarea
                        id="descricao"
                        className="flex-1 min-h-[150px] resize-none bg-background font-mono text-sm leading-relaxed p-4"
                        value={form.descricao}
                        onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                        placeholder="Detalhes da proposta..."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Pronto para fechar negócio?</p>
                    <p className="text-xs text-muted-foreground">Ao salvar, a proposta ficará disponível para envio.</p>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="ghost" asChild className="hover:bg-muted/50">
                      <Link href="/dashboard/propostas">Cancelar</Link>
                    </Button>
                    <Button type="submit" disabled={loading} className="px-8 bg-foreground text-background hover:bg-foreground/90">
                      {loading ? "Gerando..." : "Gerar Proposta"}
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
