"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
} from "lucide-react";

type ContaReceber = {
  id: string;
  descricao: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  categoria: string;
  valor: number | string;
  data_vencimento: string;
  data_recebimento: string | null;
  status: string;
  forma_pagamento: string | null;
  observacoes: string | null;
  recorrencia: string;
  parcela_atual: number | null;
  total_parcelas: number | null;
  documento_referencia: string | null;
  projeto_id: string | null;
  created_at: string | null;
};

type Cliente = { id: string; nome: string };

type Resumo = {
  total_a_receber: number;
  total_recebido: number;
  contas_vencidas_receber: number;
  saldo: number;
};

const categorias = [
  { value: "projeto", label: "Projeto" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "consultoria", label: "Consultoria" },
  { value: "comissao", label: "Comissão" },
  { value: "venda", label: "Venda" },
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

const statusLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400" },
  recebido: { label: "Recebido", color: "bg-green-500/20 text-green-400" },
  vencido: { label: "Vencido", color: "bg-red-500/20 text-red-400" },
  cancelado: { label: "Cancelado", color: "bg-gray-500/20 text-gray-400" },
  parcial: { label: "Parcial", color: "bg-blue-500/20 text-blue-400" },
};

const emptyForm = {
  descricao: "",
  cliente_id: "",
  cliente_nome: "",
  categoria: "projeto",
  valor: "",
  data_vencimento: "",
  data_recebimento: "",
  status: "pendente",
  forma_pagamento: "",
  observacoes: "",
  recorrencia: "nenhuma",
  parcela_atual: "",
  total_parcelas: "",
  documento_referencia: "",
};

export default function ContasReceberPage() {
  const { toast } = useToast();
  const [list, setList] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  async function load() {
    setLoading(true);
    try {
      const statusParam = filterStatus ? `?status=${filterStatus}` : "";
      const [contas, cls, res] = await Promise.all([
        api<ContaReceber[]>(`/api/v1/financeiro/contas-receber${statusParam}`).catch(() => []),
        api<Cliente[]>("/api/v1/clientes").catch(() => []),
        api<Resumo>("/api/v1/financeiro/resumo").catch(() => null),
      ]);
      setList(Array.isArray(contas) ? contas : []);
      setClientes(Array.isArray(cls) ? cls : []);
      if (res) setResumo(res);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterStatus]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(conta: ContaReceber) {
    setEditId(conta.id);
    setForm({
      descricao: conta.descricao,
      cliente_id: conta.cliente_id || "",
      cliente_nome: conta.cliente_nome || "",
      categoria: conta.categoria,
      valor: String(conta.valor),
      data_vencimento: conta.data_vencimento,
      data_recebimento: conta.data_recebimento || "",
      status: conta.status,
      forma_pagamento: conta.forma_pagamento || "",
      observacoes: conta.observacoes || "",
      recorrencia: conta.recorrencia || "nenhuma",
      parcela_atual: conta.parcela_atual != null ? String(conta.parcela_atual) : "",
      total_parcelas: conta.total_parcelas != null ? String(conta.total_parcelas) : "",
      documento_referencia: conta.documento_referencia || "",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.descricao || !form.valor || !form.data_vencimento) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        descricao: form.descricao,
        cliente_id: form.cliente_id || null,
        cliente_nome: form.cliente_nome || null,
        categoria: form.categoria,
        valor: parseFloat(form.valor),
        data_vencimento: form.data_vencimento,
        data_recebimento: form.data_recebimento || null,
        status: form.status,
        forma_pagamento: form.forma_pagamento || null,
        observacoes: form.observacoes || null,
        recorrencia: form.recorrencia,
        parcela_atual: form.parcela_atual ? parseInt(form.parcela_atual) : null,
        total_parcelas: form.total_parcelas ? parseInt(form.total_parcelas) : null,
        documento_referencia: form.documento_referencia || null,
      };

      if (editId) {
        await api(`/api/v1/financeiro/contas-receber/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Conta atualizada com sucesso!" });
      } else {
        await api("/api/v1/financeiro/contas-receber", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Conta criada com sucesso!" });
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
      await api(`/api/v1/financeiro/contas-receber/${deleteId}`, { method: "DELETE" });
      toast({ title: "Conta excluída!" });
      setDeleteId(null);
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao excluir", variant: "destructive" });
    }
  }

  async function handleReceber() {
    if (!receiveId) return;
    try {
      await api(`/api/v1/financeiro/contas-receber/${receiveId}/receber`, { method: "POST" });
      toast({ title: "Conta marcada como recebida!" });
      setReceiveId(null);
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao receber", variant: "destructive" });
    }
  }

  function formatCurrency(v: number | string) {
    const num = typeof v === "string" ? parseFloat(v) : v;
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function isVencido(conta: ContaReceber) {
    if (conta.status !== "pendente") return false;
    return new Date(conta.data_vencimento) < new Date();
  }

  function getClienteName(conta: ContaReceber) {
    if (conta.cliente_nome) return conta.cliente_nome;
    if (conta.cliente_id) {
      const c = clientes.find((cl) => cl.id === conta.cliente_id);
      return c?.nome || "-";
    }
    return "-";
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas a Receber</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas receitas e cobranças</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Nova Conta
        </Button>
      </div>

      {/* Cards resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total a Receber</p>
                <p className="text-xl font-bold">{resumo ? formatCurrency(resumo.total_a_receber) : "..."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Recebido</p>
                <p className="text-xl font-bold">{resumo ? formatCurrency(resumo.total_recebido) : "..."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-xl font-bold">{resumo ? resumo.contas_vencidas_receber : "..."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${resumo && resumo.saldo >= 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
                <TrendingUp className={`h-5 w-5 ${resumo && resumo.saldo >= 0 ? "text-green-400" : "text-red-400"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-xl font-bold ${resumo && resumo.saldo >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {resumo ? formatCurrency(resumo.saldo) : "..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <Label className="text-sm">Filtrar por status:</Label>
        {["", "pendente", "recebido", "vencido", "cancelado"].map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(s)}
          >
            {s === "" ? "Todos" : (statusLabels[s]?.label || s)}
          </Button>
        ))}
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
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma conta a receber encontrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((conta) => {
                  const st = statusLabels[conta.status] || statusLabels.pendente;
                  const vencido = isVencido(conta);
                  return (
                    <TableRow key={conta.id} className={vencido ? "bg-red-500/5" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{conta.descricao}</p>
                          {conta.documento_referencia && (
                            <p className="text-xs text-muted-foreground">{conta.documento_referencia}</p>
                          )}
                          {conta.parcela_atual && conta.total_parcelas && (
                            <p className="text-xs text-muted-foreground">
                              Parcela {conta.parcela_atual}/{conta.total_parcelas}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{getClienteName(conta)}</TableCell>
                      <TableCell className="text-sm capitalize">{conta.categoria.replace("_", " ")}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(conta.valor)}</TableCell>
                      <TableCell className={`text-sm ${vencido ? "text-red-400 font-medium" : ""}`}>
                        {new Date(conta.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                        {vencido && <AlertTriangle className="h-3 w-3 inline ml-1 text-red-400" />}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {conta.status === "pendente" && (
                            <Button variant="ghost" size="icon" title="Marcar como recebido" onClick={() => setReceiveId(conta.id)}>
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(conta)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(conta.id)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
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

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Conta a Receber" : "Nova Conta a Receber"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Descrição *</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Mensalidade software"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cliente</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.cliente_id}
                  onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Nome do Cliente (manual)</Label>
                <Input
                  value={form.cliente_nome}
                  onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })}
                  placeholder="Se não tiver cliente cadastrado"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="pendente">Pendente</option>
                  <option value="recebido">Recebido</option>
                  <option value="vencido">Vencido</option>
                  <option value="cancelado">Cancelado</option>
                  <option value="parcial">Parcial</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Data de Recebimento</Label>
                <Input
                  type="date"
                  value={form.data_recebimento}
                  onChange={(e) => setForm({ ...form, data_recebimento: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Recorrência</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.recorrencia}
                  onChange={(e) => setForm({ ...form, recorrencia: e.target.value })}
                >
                  <option value="nenhuma">Nenhuma</option>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Parcela Atual</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.parcela_atual}
                  onChange={(e) => setForm({ ...form, parcela_atual: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div className="grid gap-2">
                <Label>Total Parcelas</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.total_parcelas}
                  onChange={(e) => setForm({ ...form, total_parcelas: e.target.value })}
                  placeholder="12"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Documento de Referência</Label>
              <Input
                value={form.documento_referencia}
                onChange={(e) => setForm({ ...form, documento_referencia: e.target.value })}
                placeholder="NF, contrato, proposta..."
              />
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
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conta será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog confirmar recebimento */}
      <AlertDialog open={!!receiveId} onOpenChange={() => setReceiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como recebido?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta será marcada como recebida com a data de hoje.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReceber}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmar Recebimento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
