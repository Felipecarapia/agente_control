"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus, Pencil, Trash2, Repeat, Loader2, CalendarClock, DollarSign, RefreshCw,
} from "lucide-react";

type DespesaFixa = {
  id: string;
  descricao: string;
  valor: number | string;
  categoria: string;
  fornecedor: string | null;
  dia_vencimento: number;
  forma_pagamento: string | null;
  centro_custo_id: string | null;
  conta_bancaria_id: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string | null;
};

type CentroCusto = { id: string; nome: string; codigo: string };
type ContaBancaria = { id: string; nome_banco: string };

const categorias = [
  { value: "fornecedor", label: "Fornecedor" },
  { value: "aluguel", label: "Aluguel" },
  { value: "salario", label: "Salário" },
  { value: "imposto", label: "Imposto" },
  { value: "servico", label: "Serviço" },
  { value: "software", label: "Software" },
  { value: "marketing", label: "Marketing" },
  { value: "infraestrutura", label: "Infraestrutura" },
  { value: "outros", label: "Outros" },
];

const formasPagamento = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cheque", label: "Cheque" },
  { value: "outros", label: "Outros" },
];

const emptyForm = {
  descricao: "",
  valor: "",
  categoria: "outros",
  fornecedor: "",
  dia_vencimento: "10",
  forma_pagamento: "",
  centro_custo_id: "",
  conta_bancaria_id: "",
  ativo: true,
  observacoes: "",
};

function formatCurrency(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function DespesasFixasPage() {
  const { toast } = useToast();
  const [list, setList] = useState<DespesaFixa[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [despesas, cc, cb] = await Promise.all([
        api<DespesaFixa[]>("/api/v1/financeiro/despesas-fixas").catch(() => []),
        api<CentroCusto[]>("/api/v1/financeiro/centros-custo").catch(() => []),
        api<ContaBancaria[]>("/api/v1/financeiro/contas-bancarias").catch(() => []),
      ]);
      setList(Array.isArray(despesas) ? despesas : []);
      setCentrosCusto(Array.isArray(cc) ? cc : []);
      setContasBancarias(Array.isArray(cb) ? cb : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item: DespesaFixa) {
    setEditId(item.id);
    setForm({
      descricao: item.descricao,
      valor: String(item.valor),
      categoria: item.categoria,
      fornecedor: item.fornecedor || "",
      dia_vencimento: String(item.dia_vencimento),
      forma_pagamento: item.forma_pagamento || "",
      centro_custo_id: item.centro_custo_id || "",
      conta_bancaria_id: item.conta_bancaria_id || "",
      ativo: item.ativo,
      observacoes: item.observacoes || "",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.descricao || !form.valor) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        descricao: form.descricao,
        valor: parseFloat(form.valor),
        categoria: form.categoria,
        fornecedor: form.fornecedor || null,
        dia_vencimento: parseInt(form.dia_vencimento) || 10,
        forma_pagamento: form.forma_pagamento || null,
        centro_custo_id: form.centro_custo_id || null,
        conta_bancaria_id: form.conta_bancaria_id || null,
        ativo: form.ativo,
        observacoes: form.observacoes || null,
      };
      if (editId) {
        await api(`/api/v1/financeiro/despesas-fixas/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Despesa fixa atualizada!" });
      } else {
        await api("/api/v1/financeiro/despesas-fixas", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Despesa fixa criada! Conta a pagar do mês gerada automaticamente." });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/financeiro/despesas-fixas/${deleteId}`, { method: "DELETE" });
      toast({ title: "Despesa fixa excluída!" });
      setDeleteId(null);
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao excluir", variant: "destructive" });
    }
  }

  async function handleGerarMes() {
    setGenerating(true);
    try {
      const result = await api<{ geradas: number; mes: number; ano: number }>(
        "/api/v1/financeiro/despesas-fixas/gerar-mes",
        { method: "POST" }
      );
      if (result) {
        toast({ title: `${result.geradas} conta(s) gerada(s) para ${String(result.mes).padStart(2, "0")}/${result.ano}` });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao gerar", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  const totalAtivas = list.filter(d => d.ativo).reduce((acc, d) => {
    return acc + (typeof d.valor === "string" ? parseFloat(d.valor) : d.valor);
  }, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Despesas Fixas</h1>
          <p className="text-muted-foreground text-sm">Despesas recorrentes que são geradas mensalmente</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGerarMes} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Gerar Contas do Mês
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Repeat className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ativas</p>
                <p className="text-xl font-bold">{list.filter(d => d.ativo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Mensal Total</p>
                <p className="text-xl font-bold">{formatCurrency(totalAtivas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CalendarClock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cadastradas</p>
                <p className="text-xl font-bold">{list.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center">
              <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma despesa fixa cadastrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Dia Venc.</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id} className={!item.ativo ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{item.descricao}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(item.valor)}</TableCell>
                    <TableCell className="text-sm">Dia {item.dia_vencimento}</TableCell>
                    <TableCell className="text-sm capitalize">{item.categoria.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm">{item.fornecedor || "-"}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.ativo ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {item.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Despesa Fixa" : "Nova Despesa Fixa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Descrição *</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Aluguel escritório"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Dia do Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={form.dia_vencimento}
                  onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  {categorias.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fornecedor</Label>
                <Input
                  value={form.fornecedor}
                  onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="grid gap-2">
                <Label>Forma de Pagamento</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.forma_pagamento}
                  onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {formasPagamento.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Centro de Custo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.centro_custo_id}
                  onChange={(e) => setForm({ ...form, centro_custo_id: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {centrosCusto.map((cc) => (
                    <option key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Conta Bancária</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.conta_bancaria_id}
                  onChange={(e) => setForm({ ...form, conta_bancaria_id: e.target.value })}
                >
                  <option value="">Nenhuma</option>
                  {contasBancarias.map((cb) => (
                    <option key={cb.id} value={cb.id}>{cb.nome_banco}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Notas adicionais..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="ativo">Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa fixa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As contas já geradas não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
