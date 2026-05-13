"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, UserCircle, Crown, Bot, Database, Sparkles, Building2, User, Phone, MapPin } from "lucide-react";

const emptyForm = {
  tipo: "pj" as "pf" | "pj",
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
  // New fields for the workflow
  plano: "pro",
  vincular_sofia: true,
  criar_crm: true,
  openai_api_key: "",
};

const PLANS = [
  { id: "basic", name: "Basic", price: "R$ 497/mês", description: "CRM Simples" },
  { id: "pro", name: "Pro", price: "R$ 997/mês", description: "CRM + Automação" },
  { id: "premium", name: "Premium", price: "R$ 2.497/mês", description: "CRM + Sofia IA Premium" }
];

export default function NovoClientePage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/v1/clientes", {
        method: "POST",
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
          openai_api_key: form.openai_api_key || null,
          plano: form.plano,
        }),
      });
      router.push("/dashboard/clientes");
      router.refresh();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err?.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  const isPj = form.tipo === "pj";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="hover:bg-muted/50 rounded-full h-10 w-10">
          <Link href="/dashboard/clientes"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Onboarding de Cliente <Sparkles className="h-5 w-5 text-amber-500" />
          </h1>
          <p className="text-muted-foreground mt-1">Cadastre o cliente, selecione o plano e configure a Sofia.</p>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Coluna Esquerda - Dados do Cliente */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="shadow-lg border-border/50 bg-card overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-blue-500" /> Dados Principais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="flex bg-muted/50 p-1 rounded-lg w-full max-w-sm">
                <button 
                  type="button" 
                  onClick={() => setForm(f => ({ ...f, tipo: "pj" }))} 
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all ${isPj ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Building2 className="h-4 w-4" /> Empresa (PJ)
                </button>
                <button 
                  type="button" 
                  onClick={() => setForm(f => ({ ...f, tipo: "pf" }))} 
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-md transition-all ${!isPj ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <User className="h-4 w-4" /> Física (PF)
                </button>
              </div>

              {isPj ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Fantasia *</Label>
                      <Input id="nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required className="h-11 bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razao_social" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Razão Social</Label>
                      <Input id="razao_social" value={form.razao_social} onChange={e => setForm(f => ({ ...f, razao_social: e.target.value }))} className="h-11 bg-muted/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cnpj" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CNPJ</Label>
                      <Input id="cnpj" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" className="h-11 bg-muted/20 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inscricao_estadual" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inscrição Estadual</Label>
                      <Input id="inscricao_estadual" value={form.inscricao_estadual} onChange={e => setForm(f => ({ ...f, inscricao_estadual: e.target.value }))} className="h-11 bg-muted/20 font-mono" />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Completo *</Label>
                    <Input id="nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required className="h-11 bg-muted/20" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CPF</Label>
                      <Input id="cpf" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" className="h-11 bg-muted/20 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rg" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">RG</Label>
                      <Input id="rg" value={form.rg} onChange={e => setForm(f => ({ ...f, rg: e.target.value }))} className="h-11 bg-muted/20 font-mono" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="pt-4 border-t border-border/40">
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-4 text-foreground"><Phone className="h-4 w-4" /> Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-11 bg-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="celular" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Celular (WhatsApp)</Label>
                    <Input id="celular" value={form.celular} onChange={e => setForm(f => ({ ...f, celular: e.target.value }))} placeholder="(00) 00000-0000" className="h-11 bg-muted/20 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telefone Fixo</Label>
                    <Input id="telefone" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 0000-0000" className="h-11 bg-muted/20 font-mono" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40">
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-4 text-foreground"><MapPin className="h-4 w-4" /> Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cep" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CEP</Label>
                    <Input id="cep" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} placeholder="00000-000" className="h-11 bg-muted/20 font-mono" />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="endereco" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logradouro</Label>
                    <Input id="endereco" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} className="h-11 bg-muted/20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Número</Label>
                    <Input id="numero" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} className="h-11 bg-muted/20 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complemento" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Complemento</Label>
                    <Input id="complemento" value={form.complemento} onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))} className="h-11 bg-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bairro</Label>
                    <Input id="bairro" value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} className="h-11 bg-muted/20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cidade" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cidade</Label>
                    <Input id="cidade" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} className="h-11 bg-muted/20" />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Setup, Planos e IA */}
        <div className="space-y-6">
          <Card className="shadow-lg border-emerald-500/20 bg-card overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-green-400" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-emerald-500" /> Plano Contratado
              </CardTitle>
              <CardDescription>Qual pacote o cliente fechou?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PLANS.map(plan => (
                <div 
                  key={plan.id}
                  onClick={() => setForm(f => ({ ...f, plano: plan.id }))}
                  className={`cursor-pointer border rounded-xl p-4 transition-all ${form.plano === plan.id ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500" : "border-border/50 hover:border-foreground/30"}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-foreground">{plan.name}</span>
                    <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">{plan.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-indigo-500/20 bg-card overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-500" /> Setup IA & CRM
              </CardTitle>
              <CardDescription>Ações pós-cadastro automatizadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                <div
                  onClick={() => setForm(f => ({ ...f, criar_crm: !f.criar_crm }))}
                  className={`mt-0.5 w-9 h-5 rounded-full relative transition-colors duration-200 ${form.criar_crm ? "bg-indigo-500" : "bg-muted"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-transform duration-200 ${form.criar_crm ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> Criar Ambiente CRM</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Criar site CRM dedicado para o cliente (em breve).</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                <div
                  onClick={() => setForm(f => ({ ...f, vincular_sofia: !f.vincular_sofia }))}
                  className={`mt-0.5 w-9 h-5 rounded-full relative transition-colors duration-200 ${form.vincular_sofia ? "bg-indigo-500" : "bg-muted"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-transform duration-200 ${form.vincular_sofia ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" /> Vincular Sofia ao WhatsApp</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Conectar assistente inteligente ao celular do cliente via Evolution API.</p>
                </div>
              </label>

              {form.vincular_sofia && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2 pt-2">
                  <Label htmlFor="openai_key" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">OpenAI API Key do Cliente</Label>
                  <div className="relative">
                    <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
                    <Input 
                      id="openai_key"
                      type="password"
                      placeholder="sk-..."
                      value={form.openai_api_key}
                      onChange={e => setForm(f => ({ ...f, openai_api_key: e.target.value }))}
                      className="pl-9 bg-muted/20 border-indigo-500/30 focus:border-indigo-500 h-11"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">* Esta chave será usada exclusivamente para os agentes deste cliente.</p>
                </motion.div>
              )}

            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 pt-4">
            <Button type="submit" disabled={loading} className="w-full h-12 text-md font-medium bg-foreground text-background hover:bg-foreground/90">
              {loading ? "Cadastrando..." : "Finalizar Onboarding do Cliente"}
            </Button>
            <Button type="button" variant="ghost" asChild className="w-full">
              <Link href="/dashboard/clientes">Cancelar</Link>
            </Button>
          </div>

        </div>
      </form>
    </motion.div>
  );
}
