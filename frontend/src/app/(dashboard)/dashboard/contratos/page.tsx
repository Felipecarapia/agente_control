"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Cliente = { id: string; nome: string };
type Projeto = { id: string; nome: string };
type Proposta = { id: string; titulo: string };
type Contrato = { id: string; numero: string; proposta_id: string | null; cliente_id: string; projeto_id: string | null; valor: string; data_inicio: string | null; data_fim: string | null; status: string };

export default function ContratosPage() {
  const [list, setList] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ numero: "", proposta_id: "", cliente_id: "", projeto_id: "", valor: "", data_inicio: "", data_fim: "", status: "ativo" });

  async function load() {
    setLoading(true);
    try {
      const [ct, c, p, pr] = await Promise.all([
        api<Contrato[]>("/api/v1/contratos"),
        api<Cliente[]>("/api/v1/clientes"),
        api<Projeto[]>("/api/v1/projetos"),
        api<Proposta[]>("/api/v1/propostas"),
      ]);
      setList(ct);
      setClientes(c);
      setProjetos(p);
      setPropostas(pr);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditId(null);
    setForm({ numero: "", proposta_id: "", cliente_id: clientes[0]?.id ?? "", projeto_id: "", valor: "", data_inicio: "", data_fim: "", status: "ativo" });
    setOpen(true);
  }
  function openEdit(item: Contrato) {
    setEditId(item.id);
    setForm({ numero: item.numero, proposta_id: item.proposta_id ?? "", cliente_id: item.cliente_id, projeto_id: item.projeto_id ?? "", valor: String(item.valor ?? ""), data_inicio: item.data_inicio || "", data_fim: item.data_fim || "", status: item.status });
    setOpen(true);
  }
  async function save() {
    try {
      const body = { numero: form.numero, proposta_id: form.proposta_id || null, cliente_id: form.cliente_id, projeto_id: form.projeto_id || null, valor: form.valor ? parseFloat(form.valor) : null, data_inicio: form.data_inicio || null, data_fim: form.data_fim || null, status: form.status };
      if (editId) await api(`/api/v1/contratos/${editId}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/v1/contratos", { method: "POST", body: JSON.stringify(body) });
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
      await api(`/api/v1/contratos/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      load();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }
  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">Gerencie os contratos</p>
        </div>
        <Button onClick={openCreate} disabled={clientes.length === 0}><Plus className="h-4 w-4" /> Novo contrato</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Lista</CardTitle></CardHeader>
        <CardContent className="p-0 pt-0">
          {loading ? <p className="p-4 text-muted-foreground">Carregando...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.numero}</TableCell>
                    <TableCell>{clienteMap[item.cliente_id] ?? "-"}</TableCell>
                    <TableCell>{item.valor ?? "-"}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? "Editar contrato" : "Novo contrato"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Cliente</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.cliente_id} onChange={(e) => setForm((f) => ({ ...f, cliente_id: e.target.value }))}>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="grid gap-2"><Label>Proposta (opcional)</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.proposta_id} onChange={(e) => setForm((f) => ({ ...f, proposta_id: e.target.value }))}>
                <option value="">Nenhuma</option>
                {propostas.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>
            </div>
            <div className="grid gap-2"><Label>Projeto (opcional)</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.projeto_id} onChange={(e) => setForm((f) => ({ ...f, projeto_id: e.target.value }))}>
                <option value="">Nenhum</option>
                {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="grid gap-2"><Label>Valor</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Data início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Data fim</Label><Input type="date" value={form.data_fim} onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Status</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="ativo">Ativo</option><option value="encerrado">Encerrado</option>
              </select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir contrato?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
