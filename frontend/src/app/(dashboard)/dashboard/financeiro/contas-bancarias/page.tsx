"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Building2, Loader2, CreditCard } from "lucide-react";

type ContaBancaria = {
  id: string;
  nome_banco: string;
  agencia: string | null;
  numero_conta: string | null;
  tipo_conta: string;
  saldo_inicial: number | string;
  pix_chave: string | null;
  titular: string | null;
  ativo: boolean;
  created_at: string | null;
};

const tipoContaLabels: Record<string, string> = {
  corrente: "Corrente",
  poupanca: "Poupança",
  investimento: "Investimento",
};

const emptyForm = {
  nome_banco: "",
  agencia: "",
  numero_conta: "",
  tipo_conta: "corrente",
  saldo_inicial: "",
  pix_chave: "",
  titular: "",
  ativo: true,
};

function formatCurrency(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ContasBancariasPage() {
  const { toast } = useToast();
  const [list, setList] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<ContaBancaria[]>("/api/v1/financeiro/contas-bancarias").catch(() => []);
      setList(Array.isArray(data) ? data : []);
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

  function openEdit(item: ContaBancaria) {
    setEditId(item.id);
    setForm({
      nome_banco: item.nome_banco,
      agencia: item.agencia || "",
      numero_conta: item.numero_conta || "",
      tipo_conta: item.tipo_conta,
      saldo_inicial: String(item.saldo_inicial),
      pix_chave: item.pix_chave || "",
      titular: item.titular || "",
      ativo: item.ativo,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.nome_banco) {
      toast({ title: "Informe o nome do banco", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome_banco: form.nome_banco,
        agencia: form.agencia || null,
        numero_conta: form.numero_conta || null,
        tipo_conta: form.tipo_conta,
        saldo_inicial: form.saldo_inicial ? parseFloat(form.saldo_inicial) : 0,
        pix_chave: form.pix_chave || null,
        titular: form.titular || null,
        ativo: form.ativo,
      };
      if (editId) {
        await api(`/api/v1/financeiro/contas-bancarias/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Conta bancária atualizada!" });
      } else {
        await api("/api/v1/financeiro/contas-bancarias", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Conta bancária criada!" });
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
      await api(`/api/v1/financeiro/contas-bancarias/${deleteId}`, { method: "DELETE" });
      toast({ title: "Conta bancária excluída!" });
      setDeleteId(null);
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao excluir", variant: "destructive" });
    }
  }

  const totalSaldo = list.filter(c => c.ativo).reduce((acc, c) => {
    return acc + (typeof c.saldo_inicial === "string" ? parseFloat(c.saldo_inicial) : c.saldo_inicial);
  }, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas Bancárias</h1>
          <p className="text-muted-foreground text-sm">Gerencie as contas bancárias da empresa</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Nova Conta
        </Button>
      </div>

      {/* Card de saldo total */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Total (Contas Ativas)</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSaldo)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards das contas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma conta bancária cadastrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((conta) => (
            <Card key={conta.id} className={!conta.ativo ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{conta.nome_banco}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {tipoContaLabels[conta.tipo_conta] || conta.tipo_conta}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${conta.ativo ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {conta.ativo ? "Ativa" : "Inativa"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{formatCurrency(conta.saldo_inicial)}</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {conta.agencia && (
                    <div>
                      <span className="text-xs">Agência:</span>
                      <p className="font-medium text-foreground">{conta.agencia}</p>
                    </div>
                  )}
                  {conta.numero_conta && (
                    <div>
                      <span className="text-xs">Conta:</span>
                      <p className="font-medium text-foreground">{conta.numero_conta}</p>
                    </div>
                  )}
                  {conta.pix_chave && (
                    <div className="col-span-2">
                      <span className="text-xs">Chave PIX:</span>
                      <p className="font-medium text-foreground truncate">{conta.pix_chave}</p>
                    </div>
                  )}
                  {conta.titular && (
                    <div className="col-span-2">
                      <span className="text-xs">Titular:</span>
                      <p className="font-medium text-foreground">{conta.titular}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(conta)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(conta.id)}>
                    <Trash2 className="h-4 w-4 mr-1 text-red-400" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Conta Bancária" : "Nova Conta Bancária"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome do Banco *</Label>
              <Input
                value={form.nome_banco}
                onChange={(e) => setForm({ ...form, nome_banco: e.target.value })}
                placeholder="Ex: Banco do Brasil, Nubank..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Agência</Label>
                <Input
                  value={form.agencia}
                  onChange={(e) => setForm({ ...form, agencia: e.target.value })}
                  placeholder="0001"
                />
              </div>
              <div className="grid gap-2">
                <Label>Número da Conta</Label>
                <Input
                  value={form.numero_conta}
                  onChange={(e) => setForm({ ...form, numero_conta: e.target.value })}
                  placeholder="12345-6"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Conta</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.tipo_conta}
                  onChange={(e) => setForm({ ...form, tipo_conta: e.target.value })}
                >
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupança</option>
                  <option value="investimento">Investimento</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Saldo Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.saldo_inicial}
                  onChange={(e) => setForm({ ...form, saldo_inicial: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Chave PIX</Label>
              <Input
                value={form.pix_chave}
                onChange={(e) => setForm({ ...form, pix_chave: e.target.value })}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
              />
            </div>
            <div className="grid gap-2">
              <Label>Titular</Label>
              <Input
                value={form.titular}
                onChange={(e) => setForm({ ...form, titular: e.target.value })}
                placeholder="Nome do titular"
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
            <AlertDialogTitle>Excluir conta bancária?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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
