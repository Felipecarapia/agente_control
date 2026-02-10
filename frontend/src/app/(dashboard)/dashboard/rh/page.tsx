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
  Plus, Pencil, Trash2, UsersRound, Loader2, DollarSign, Briefcase, GraduationCap, Building,
} from "lucide-react";

type Funcionario = {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  departamento: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
  tipo_contrato: string;
  salario_bruto: number | string;
  vale_transporte: number | string | null;
  vale_refeicao: number | string | null;
  plano_saude: number | string | null;
  outros_beneficios: number | string | null;
  centro_custo_id: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string | null;
};

type Resumo = {
  total_funcionarios: number;
  total_ativos: number;
  total_clt: number;
  total_pj: number;
  total_estagiarios: number;
  total_folha: number;
  total_beneficios: number;
  custo_total: number;
};

type CentroCusto = { id: string; nome: string; codigo: string };

const tipoContratoLabels: Record<string, string> = {
  clt: "CLT",
  pj: "PJ",
  estagiario: "Estagiário",
  temporario: "Temporário",
};

const emptyForm = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
  cargo: "",
  departamento: "",
  data_admissao: "",
  data_demissao: "",
  tipo_contrato: "clt",
  salario_bruto: "",
  vale_transporte: "",
  vale_refeicao: "",
  plano_saude: "",
  outros_beneficios: "",
  centro_custo_id: "",
  ativo: true,
  observacoes: "",
};

function formatCurrency(v: number | string) {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RHPage() {
  const { toast } = useToast();
  const [list, setList] = useState<Funcionario[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [funcs, res, cc] = await Promise.all([
        api<Funcionario[]>("/api/v1/rh/funcionarios").catch(() => []),
        api<Resumo>("/api/v1/rh/resumo").catch(() => null),
        api<CentroCusto[]>("/api/v1/financeiro/centros-custo").catch(() => []),
      ]);
      setList(Array.isArray(funcs) ? funcs : []);
      if (res) setResumo(res);
      setCentrosCusto(Array.isArray(cc) ? cc : []);
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

  function openEdit(item: Funcionario) {
    setEditId(item.id);
    setForm({
      nome: item.nome,
      cpf: item.cpf || "",
      email: item.email || "",
      telefone: item.telefone || "",
      cargo: item.cargo || "",
      departamento: item.departamento || "",
      data_admissao: item.data_admissao || "",
      data_demissao: item.data_demissao || "",
      tipo_contrato: item.tipo_contrato,
      salario_bruto: String(item.salario_bruto || ""),
      vale_transporte: String(item.vale_transporte || ""),
      vale_refeicao: String(item.vale_refeicao || ""),
      plano_saude: String(item.plano_saude || ""),
      outros_beneficios: String(item.outros_beneficios || ""),
      centro_custo_id: item.centro_custo_id || "",
      ativo: item.ativo,
      observacoes: item.observacoes || "",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.nome || !form.salario_bruto) {
      toast({ title: "Preencha nome e salário bruto", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nome: form.nome,
        cpf: form.cpf || null,
        email: form.email || null,
        telefone: form.telefone || null,
        cargo: form.cargo || null,
        departamento: form.departamento || null,
        data_admissao: form.data_admissao || null,
        data_demissao: form.data_demissao || null,
        tipo_contrato: form.tipo_contrato,
        salario_bruto: parseFloat(form.salario_bruto) || 0,
        vale_transporte: form.vale_transporte ? parseFloat(form.vale_transporte) : 0,
        vale_refeicao: form.vale_refeicao ? parseFloat(form.vale_refeicao) : 0,
        plano_saude: form.plano_saude ? parseFloat(form.plano_saude) : 0,
        outros_beneficios: form.outros_beneficios ? parseFloat(form.outros_beneficios) : 0,
        centro_custo_id: form.centro_custo_id || null,
        ativo: form.ativo,
        observacoes: form.observacoes || null,
      };
      if (editId) {
        await api(`/api/v1/rh/funcionarios/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Funcionário atualizado!" });
      } else {
        await api("/api/v1/rh/funcionarios", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Funcionário cadastrado! Despesa fixa de salário gerada automaticamente." });
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
      await api(`/api/v1/rh/funcionarios/${deleteId}`, { method: "DELETE" });
      toast({ title: "Funcionário excluído!" });
      setDeleteId(null);
      load();
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao excluir", variant: "destructive" });
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recursos Humanos</h1>
          <p className="text-muted-foreground text-sm">Gerencie funcionários, salários e benefícios</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Funcionário
        </Button>
      </div>

      {/* Cards resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <UsersRound className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Funcionários Ativos</p>
                <p className="text-xl font-bold">{resumo?.total_ativos ?? "..."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Briefcase className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CLT / PJ / Estag.</p>
                <p className="text-xl font-bold">
                  {resumo ? `${resumo.total_clt} / ${resumo.total_pj} / ${resumo.total_estagiarios}` : "..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Folha</p>
                <p className="text-xl font-bold">{resumo ? formatCurrency(resumo.total_folha) : "..."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-xl font-bold">{resumo ? formatCurrency(resumo.custo_total) : "..."}</p>
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
              <UsersRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum funcionário cadastrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Salário Bruto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((func) => (
                  <TableRow key={func.id} className={!func.ativo ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{func.nome}</p>
                        {func.email && <p className="text-xs text-muted-foreground">{func.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{func.cargo || "-"}</TableCell>
                    <TableCell className="text-sm">{func.departamento || "-"}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        func.tipo_contrato === "clt" ? "bg-blue-500/20 text-blue-400" :
                        func.tipo_contrato === "pj" ? "bg-purple-500/20 text-purple-400" :
                        "bg-orange-500/20 text-orange-400"
                      }`}>
                        {tipoContratoLabels[func.tipo_contrato] || func.tipo_contrato}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(func.salario_bruto)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${func.ativo ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                        {func.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(func)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(func.id)}>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Dados pessoais */}
            <p className="text-sm font-semibold text-muted-foreground">Dados Pessoais</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid gap-2">
                <Label>CPF</Label>
                <Input
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Dados profissionais */}
            <p className="text-sm font-semibold text-muted-foreground mt-2">Dados Profissionais</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Cargo</Label>
                <Input
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  placeholder="Ex: Desenvolvedor"
                />
              </div>
              <div className="grid gap-2">
                <Label>Departamento</Label>
                <Input
                  value={form.departamento}
                  onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                  placeholder="Ex: Tecnologia"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tipo de Contrato</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.tipo_contrato}
                  onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value })}
                >
                  <option value="clt">CLT</option>
                  <option value="pj">PJ</option>
                  <option value="estagiario">Estagiário</option>
                  <option value="temporario">Temporário</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Data de Admissão</Label>
                <Input
                  type="date"
                  value={form.data_admissao}
                  onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Data de Demissão</Label>
                <Input
                  type="date"
                  value={form.data_demissao}
                  onChange={(e) => setForm({ ...form, data_demissao: e.target.value })}
                />
              </div>
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
            </div>

            {/* Remuneração */}
            <p className="text-sm font-semibold text-muted-foreground mt-2">Remuneração e Benefícios</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Salário Bruto (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.salario_bruto}
                  onChange={(e) => setForm({ ...form, salario_bruto: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Vale Transporte (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.vale_transporte}
                  onChange={(e) => setForm({ ...form, vale_transporte: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Vale Refeição (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.vale_refeicao}
                  onChange={(e) => setForm({ ...form, vale_refeicao: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Plano de Saúde (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.plano_saude}
                  onChange={(e) => setForm({ ...form, plano_saude: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Outros Benefícios (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.outros_beneficios}
                  onChange={(e) => setForm({ ...form, outros_beneficios: e.target.value })}
                  placeholder="0,00"
                />
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
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editId ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As despesas fixas geradas não serão afetadas.
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
