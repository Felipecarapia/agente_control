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
import { Plus, Pencil, Trash2, FileSignature, User, DollarSign, Calendar, Hash } from "lucide-react";

type Cliente = { id: number; nome: string };
type Projeto = { id: number; nome: string };
type Proposta = { id: number; titulo: string };
type Contrato = { id: number; numero: string; proposta_id: number | null; cliente_id: number; projeto_id: number | null; valor: string; data_inicio: string | null; data_fim: string | null; status: string };

export default function ContratosPage() {
  const [list, setList] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ numero: "", proposta_id: 0, cliente_id: 0, projeto_id: 0, valor: "", data_inicio: "", data_fim: "", status: "draft" });

  async function load() {
    setLoading(true);
    try {
      const [ct, c, p, pr] = await Promise.all([
        api<Contrato[]>("/api/v1/contratos").catch(() => []),
        api<Cliente[]>("/api/v1/clientes").catch(() => []),
        api<Projeto[]>("/api/v1/projetos").catch(() => []),
        api<Proposta[]>("/api/v1/propostas").catch(() => []),
      ]);
      
      // apiClient já extrai data do formato {ok: true, data: [...]}
      setList(Array.isArray(ct) ? ct : []);
      setClientes(Array.isArray(c) ? c : []);
      setProjetos(Array.isArray(p) ? p : []);
      setPropostas(Array.isArray(pr) ? pr : []);
    } catch (e) {
      // Silenciar erro - não quebrar UX
      setList([]);
      setClientes([]);
      setProjetos([]);
      setPropostas([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditId(null);
    setForm({ numero: "", proposta_id: 0, cliente_id: clientes[0]?.id ?? 0, projeto_id: 0, valor: "", data_inicio: "", data_fim: "", status: "draft" });
    setOpen(true);
  }
  function openEdit(item: Contrato) {
    setEditId(item.id);
    setForm({ numero: item.numero, proposta_id: item.proposta_id ?? 0, cliente_id: item.cliente_id, projeto_id: item.projeto_id ?? 0, valor: String(item.valor ?? ""), data_inicio: item.data_inicio || "", data_fim: item.data_fim || "", status: item.status });
    setOpen(true);
  }
  async function save() {
    try {
      const body = { 
        numero: form.numero, 
        proposta_id: form.proposta_id || null, 
        cliente_id: form.cliente_id, 
        projeto_id: form.projeto_id || null, 
        valor: form.valor ? Number(form.valor) : null, 
        data_inicio: form.data_inicio || null, 
        data_fim: form.data_fim || null, 
        status: form.status 
      };
      if (editId) {
        await api(`/api/v1/contratos/${editId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/api/v1/contratos", { method: "POST", body: JSON.stringify(body) });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao salvar contrato";
      
      if (errorCode === "VALIDATION_ERROR") {
        alert("Dados inválidos. Verifique os campos obrigatórios.");
      } else if (errorCode === "CONTRACT_DUPLICATE") {
        alert(`Contrato duplicado: ${errorMsg}`);
      } else if (errorCode === "CLIENT_NOT_FOUND") {
        alert("Cliente não encontrado.");
      } else if (errorCode === "PROPOSAL_NOT_FOUND") {
        alert("Proposta não encontrada.");
      } else if (errorCode === "PROJECT_NOT_FOUND") {
        alert("Projeto não encontrado.");
      } else {
        alert(`Erro ao salvar: ${errorMsg}`);
      }
    }
  }
  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/contratos/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      load();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao excluir contrato";
      
      if (errorCode === "CONTRACT_NOT_FOUND") {
        alert("Contrato não encontrado.");
      } else {
        alert(`Erro ao excluir: ${errorMsg}`);
      }
    }
  }
  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Gerencie os contratos</p>
        </div>
        <Button onClick={openCreate} disabled={clientes.length === 0} size="sm" className="lg:size-default">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo contrato</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>
      <Card>
        <CardHeader className="p-4 lg:p-6"><CardTitle className="text-base lg:text-lg">Lista</CardTitle></CardHeader>
        <CardContent className="p-0 pt-0">
          {loading ? (
            <p className="p-4 text-muted-foreground">Carregando...</p>
          ) : list.length === 0 ? (
            <div className="p-8 text-center">
              <FileSignature className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum contrato encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {clientes.length === 0 
                  ? "Crie um cliente primeiro para começar a adicionar contratos."
                  : "Comece criando seu primeiro contrato."}
              </p>
              {clientes.length > 0 && (
                <Button onClick={openCreate} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo contrato
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                {list.map((item) => (
                  <Card key={item.id} className="border border-border/60 shadow-md hover:shadow-lg transition-shadow bg-card">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                            <FileSignature className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-tight truncate text-foreground">{item.numero}</h3>
                            <p className="text-xs text-muted-foreground">#{item.id}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {item.status}
                        </span>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/50 my-3" />

                      {/* Info Compact */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-foreground truncate flex-1">{clienteMap[item.cliente_id] ?? "-"}</p>
                        </div>
                        {item.valor && (
                          <div className="flex items-center justify-between pt-1">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">{item.valor}</span>
                          </div>
                        )}
                        {item.data_inicio && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-foreground">
                              {new Date(item.data_inicio).toLocaleDateString("pt-BR")}
                              {item.data_fim ? ` - ${new Date(item.data_fim).toLocaleDateString("pt-BR")}` : ""}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="border-t border-border/50 mt-3 pt-3 flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-8 px-2" 
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Tabela para desktop - oculta */}
              <div className="hidden overflow-x-auto">
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar contrato" : "Novo contrato"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Número</Label><Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Cliente</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.cliente_id} onChange={(e) => setForm((f) => ({ ...f, cliente_id: Number(e.target.value) }))}>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="grid gap-2"><Label>Proposta (opcional)</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.proposta_id} onChange={(e) => setForm((f) => ({ ...f, proposta_id: Number(e.target.value) }))}>
                <option value={0}>Nenhuma</option>
                {propostas.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>
            </div>
            <div className="grid gap-2"><Label>Projeto (opcional)</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.projeto_id} onChange={(e) => setForm((f) => ({ ...f, projeto_id: Number(e.target.value) }))}>
                <option value={0}>Nenhum</option>
                {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div className="grid gap-2"><Label>Valor</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Data início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Data fim</Label><Input type="date" value={form.data_fim} onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Status</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="draft">Rascunho</option>
                <option value="active">Ativo</option>
                <option value="expired">Expirado</option>
                <option value="canceled">Cancelado</option>
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
