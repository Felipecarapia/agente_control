"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Pencil, Trash2, FileText, User, FolderKanban, DollarSign, Calendar, Tag } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
};

type Cliente = { id: number; nome: string };
type Projeto = { id: number; nome: string };
type Proposta = {
  id: number;
  titulo: string;
  descricao: string | null;
  valor: string | number | null;
  cliente_id: number;
  projeto_id: number | null;
  status: string;
  validade_ate: string | null;
};

export default function PropostasPage() {
  const [list, setList] = useState<Proposta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function loadList() {
    setLoading(true);
    try {
      const [p, c, pr] = await Promise.all([
        api<Proposta[]>("/api/v1/propostas").catch(() => []),
        api<Cliente[]>("/api/v1/clientes").catch(() => []),
        api<Projeto[]>("/api/v1/projetos").catch(() => []),
      ]);
      
      // apiClient já extrai data do formato {ok: true, data: [...]}
      setList(Array.isArray(p) ? p : []);
      setClientes(Array.isArray(c) ? c : []);
      setProjetos(Array.isArray(pr) ? pr : []);
    } catch (e) {
      // Silenciar erro - não quebrar UX
      setList([]);
      setClientes([]);
      setProjetos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/propostas/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadList();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao excluir proposta";
      
      if (errorCode === "PROPOSAL_NOT_FOUND") {
        alert("Proposta não encontrada");
      } else {
        alert(`Erro ao excluir: ${errorMsg}`);
      }
    }
  }

  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));
  const projetoMap = Object.fromEntries(projetos.map((p) => [p.id, p.nome]));

  function formatMoeda(val: string | number | null) {
    if (val == null || val === "") return "-";
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(n)) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(n);
  }

  function formatData(s: string | null) {
    if (!s) return "-";
    try {
      return new Date(s).toLocaleDateString("pt-BR");
    } catch {
      return "-";
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-end">
        <Button asChild size="sm" className="lg:size-default">
          <Link href="/dashboard/propostas/novo">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova proposta</span>
            <span className="sm:hidden">Nova</span>
          </Link>
        </Button>
      </div>

      <Card className="shadow-sm border-border/80">
        <CardHeader className="p-4 lg:p-6">
          <CardTitle className="text-base lg:text-lg">Lista</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma proposta encontrada</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Comece criando sua primeira proposta comercial.
              </p>
              <Button asChild className="gap-2">
                <Link href="/dashboard/propostas/novo">
                  <Plus className="h-4 w-4" />
                  Nova Proposta
                </Link>
              </Button>
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
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-tight truncate text-foreground">{item.titulo}</h3>
                            <p className="text-xs text-muted-foreground">#{item.id}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {STATUS_LABEL[item.status] ?? item.status}
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
                        {item.projeto_id && (
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-foreground truncate flex-1">{projetoMap[item.projeto_id] ?? "-"}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">{formatMoeda(item.valor)}</span>
                        </div>
                        {item.validade_ate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-foreground">{formatData(item.validade_ate)}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="border-t border-border/50 mt-3 pt-3 flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-8 px-2" 
                          asChild
                        >
                          <Link href={`/dashboard/propostas/${item.id}`} className="flex items-center justify-center">
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
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
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>{item.titulo}</TableCell>
                        <TableCell>{clienteMap[item.cliente_id] ?? "-"}</TableCell>
                        <TableCell>{item.projeto_id ? projetoMap[item.projeto_id] ?? "-" : "-"}</TableCell>
                        <TableCell className="text-right">{formatMoeda(item.valor)}</TableCell>
                        <TableCell>{STATUS_LABEL[item.status] ?? item.status}</TableCell>
                        <TableCell>{formatData(item.validade_ate)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/dashboard/propostas/${item.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
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
