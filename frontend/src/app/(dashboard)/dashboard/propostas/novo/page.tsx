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
import { ArrowLeft } from "lucide-react";

type Cliente = { id: number; nome: string };
type Projeto = { id: number; nome: string; cliente_id: number };

const emptyForm = {
  titulo: "",
  descricao: "",
  valor: "",
  cliente_id: 0,
  projeto_id: 0,
  status: "rascunho",
  validade_ate: "",
};

export default function NovaPropostaPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Cliente[]>("/api/v1/clientes").catch(() => []),
      api<Projeto[]>("/api/v1/projetos").catch(() => []),
    ])
      .then(([c, p]) => {
        // apiClient já extrai data do formato {ok: true, data: [...]}
        setClientes(Array.isArray(c) ? c : []);
        setProjetos(Array.isArray(p) ? p : []);
      })
      .catch(() => {
        // Silenciar erro - não quebrar UX
        setClientes([]);
        setProjetos([]);
      });
  }, []);

  const projetosDoCliente = form.cliente_id
    ? projetos.filter((p) => p.cliente_id === form.cliente_id)
    : projetos;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_id) {
      alert("Selecione um cliente.");
      return;
    }
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
      const errorCode = err?.code || "UNKNOWN";
      const errorMsg = err?.message || "Erro ao salvar proposta";
      
      if (errorCode === "VALIDATION_ERROR") {
        alert("Dados inválidos. Verifique os campos obrigatórios.");
      } else if (errorCode === "PROPOSAL_DUPLICATE") {
        alert(`Proposta duplicada: ${errorMsg}`);
      } else if (errorCode === "CLIENT_NOT_FOUND") {
        alert("Cliente não encontrado.");
      } else if (errorCode === "PROJECT_NOT_FOUND") {
        alert("Projeto não encontrado.");
      } else {
        alert(`Erro ao salvar: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/propostas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova proposta</h1>
          <p className="text-muted-foreground">Cadastre uma nova proposta comercial</p>
        </div>
      </div>

      <form onSubmit={submit}>
        <Card className="shadow-sm border-border/80">
          <CardHeader>
            <CardTitle>Dados da proposta</CardTitle>
            <p className="text-sm text-muted-foreground">Título, cliente, projeto, valor e status.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                required
                placeholder="Ex: Proposta Site Institucional"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <textarea
                id="descricao"
                className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Escopo, entregas, condições..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Cliente</Label>
              <select
                className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.cliente_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cliente_id: Number(e.target.value),
                    projeto_id: 0,
                  }))
                }
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
              <Label>Projeto (opcional)</Label>
              <select
                className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.projeto_id}
                onChange={(e) => setForm((f) => ({ ...f, projeto_id: Number(e.target.value) }))}
              >
                <option value={0}>Nenhum</option>
                {projetosDoCliente.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="rascunho">Rascunho</option>
                <option value="enviada">Enviada</option>
                <option value="aceita">Aceita</option>
                <option value="recusada">Recusada</option>
              </select>
            </div>

            <div className="grid gap-2 max-w-[200px]">
              <Label htmlFor="validade_ate">Validade até</Label>
              <Input
                id="validade_ate"
                type="date"
                value={form.validade_ate}
                onChange={(e) => setForm((f) => ({ ...f, validade_ate: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 mt-6">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/propostas">Cancelar</Link>
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
