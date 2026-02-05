"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FolderKanban, DollarSign, ListTodo } from "lucide-react";

const TIPOS = [
  { value: "desenvolvimento_software", label: "Desenvolvimento de software" },
  { value: "marketing", label: "Marketing" },
  { value: "infoproduto", label: "Infoproduto" },
  { value: "lancamento", label: "Lançamento" },
] as const;

type Cliente = { id: number; nome: string };

const emptyForm = {
  tipo: "desenvolvimento_software" as string,
  nome: "",
  descricao: "",
  cliente_id: 0,
  status: "ativo",
  data_inicio: "",
  data_fim: "",
  valor_orcado: "",
  valor_realizado: "",
  moeda: "BRL",
  observacoes_financeiras: "",
};

export default function NovoProjetoPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Cliente[]>("/api/v1/clientes")
      .then(setClientes)
      .catch(console.error);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_id) {
      alert("Selecione um cliente.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/v1/projetos", {
        method: "POST",
        body: JSON.stringify({
          tipo: form.tipo,
          nome: form.nome,
          descricao: form.descricao || null,
          cliente_id: form.cliente_id,
          status: form.status,
          data_inicio: form.data_inicio || null,
          data_fim: form.data_fim || null,
          valor_orcado: form.valor_orcado ? parseFloat(form.valor_orcado) : null,
          valor_realizado: form.valor_realizado ? parseFloat(form.valor_realizado) : null,
          moeda: form.moeda,
          observacoes_financeiras: form.observacoes_financeiras || null,
        }),
      });
      router.push("/dashboard/projetos");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projetos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo projeto</h1>
          <p className="text-muted-foreground">Cadastre um novo projeto (software, marketing, infoproduto, lançamento)</p>
        </div>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dados" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="tarefas" className="gap-2" disabled>
            <ListTodo className="h-4 w-4" />
            Tarefas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <form onSubmit={submit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados do projeto</CardTitle>
                <p className="text-sm text-muted-foreground">Tipo, cliente, status e datas.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label>Tipo do projeto</Label>
                  <select
                    className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome do projeto</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    required
                    placeholder="Ex: Site institucional, Campanha Black Friday..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <textarea
                    id="descricao"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Objetivos, escopo, entregas..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Cliente</Label>
                  <select
                    className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.cliente_id}
                    onChange={(e) => setForm((f) => ({ ...f, cliente_id: Number(e.target.value) }))}
                  >
                    <option value={0}>Selecione um cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="concluido">Concluído</option>
                    <option value="pausado">Pausado</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="data_inicio">Data de início</Label>
                    <Input
                      id="data_inicio"
                      type="date"
                      value={form.data_inicio}
                      onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="data_fim">Data prevista de fim</Label>
                    <Input
                      id="data_fim"
                      type="date"
                      value={form.data_fim}
                      onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 mt-6">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/projetos">Cancelar</Link>
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-6">
          <form onSubmit={submit}>
            <Card>
              <CardHeader>
                <CardTitle>Financeiro do projeto</CardTitle>
                <p className="text-sm text-muted-foreground">Valores orçados, realizados e moeda.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label>Moeda</Label>
                  <select
                    className="flex h-10 w-full max-w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.moeda}
                    onChange={(e) => setForm((f) => ({ ...f, moeda: e.target.value }))}
                  >
                    <option value="BRL">BRL (R$)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="valor_orcado">Valor orçado</Label>
                    <Input
                      id="valor_orcado"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={form.valor_orcado}
                      onChange={(e) => setForm((f) => ({ ...f, valor_orcado: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="valor_realizado">Valor realizado</Label>
                    <Input
                      id="valor_realizado"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={form.valor_realizado}
                      onChange={(e) => setForm((f) => ({ ...f, valor_realizado: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="observacoes_financeiras">Observações financeiras</Label>
                  <textarea
                    id="observacoes_financeiras"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.observacoes_financeiras}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes_financeiras: e.target.value }))}
                    placeholder="Forma de pagamento, parcelas, notas..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 mt-6">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/projetos">Cancelar</Link>
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="tarefas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas</CardTitle>
              <p className="text-sm text-muted-foreground">Tarefas do projeto (disponível após salvar).</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Salve o projeto para gerenciar tarefas.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
