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
import { Plus, Pencil, Trash2 } from "lucide-react";

type Projeto = { id: string; nome: string };
type Usuario = { id: string; nome: string };
type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  projeto_id: string;
  status: string;
  prioridade: string | null;
  responsavel_id: string | null;
  data_vencimento: string | null;
};

export default function TarefasPage() {
  const [list, setList] = useState<Tarefa[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    projeto_id: "",
    status: "pendente",
    prioridade: "",
    responsavel_id: "",
    data_vencimento: "",
  });

  async function load() {
    setLoading(true);
    try {
      const [t, p, u] = await Promise.all([
        api<Tarefa[]>("/api/v1/tarefas"),
        api<Projeto[]>("/api/v1/projetos"),
        api<Usuario[]>("/api/v1/usuarios"),
      ]);
      setList(t);
      setProjetos(p);
      setUsuarios(u);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({
      titulo: "",
      descricao: "",
      projeto_id: projetos[0]?.id ?? "",
      status: "pendente",
      prioridade: "",
      responsavel_id: "",
      data_vencimento: "",
    });
    setOpen(true);
  }

  function openEdit(t: Tarefa) {
    setEditId(t.id);
    setForm({
      titulo: t.titulo,
      descricao: t.descricao || "",
      projeto_id: t.projeto_id,
      status: t.status,
      prioridade: t.prioridade || "",
      responsavel_id: t.responsavel_id ?? "",
      data_vencimento: t.data_vencimento || "",
    });
    setOpen(true);
  }

  async function save() {
    try {
      const body = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        projeto_id: form.projeto_id,
        status: form.status,
        prioridade: form.prioridade || null,
        responsavel_id: form.responsavel_id || null,
        data_vencimento: form.data_vencimento || null,
      };
      if (editId) {
        await api(`/api/v1/tarefas/${editId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/api/v1/tarefas", { method: "POST", body: JSON.stringify(body) });
      }
      setOpen(false);
      load();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/tarefas/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      load();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  const projetoMap = Object.fromEntries(projetos.map((p) => [p.id, p.nome]));
  const usuarioMap = Object.fromEntries(usuarios.map((u) => [u.id, u.nome]));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie as tarefas</p>
        </div>
        <Button onClick={openCreate} disabled={projetos.length === 0}>
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          {loading ? (
            <p className="p-4 text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.id}</TableCell>
                    <TableCell>{t.titulo}</TableCell>
                    <TableCell>{projetoMap[t.projeto_id] ?? "-"}</TableCell>
                    <TableCell>{t.status}</TableCell>
                    <TableCell>{t.responsavel_id ? usuarioMap[t.responsavel_id] ?? "-" : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Projeto</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.projeto_id}
                onChange={(e) => setForm((f) => ({ ...f, projeto_id: e.target.value }))}
              >
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Input
                  value={form.prioridade}
                  onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}
                  placeholder="ex: alta"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Responsável</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.responsavel_id}
                onChange={(e) => setForm((f) => ({ ...f, responsavel_id: e.target.value }))}
              >
                <option value="">Nenhum</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Data vencimento</Label>
              <Input
                type="date"
                value={form.data_vencimento}
                onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
