"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, FolderKanban, User, DollarSign, Calendar, Tag, Bell } from "lucide-react";
import { CobrarModal } from "@/components/projetos/CobrarModal";
import { CardSkeleton } from "@/components/ui/card-skeleton";

const TIPO_LABEL: Record<string, string> = {
  desenvolvimento_software: "Desenvolvimento de software",
  marketing: "Marketing",
  infoproduto: "Infoproduto",
  lancamento: "Lançamento",
};

type Cliente = { id: number; nome: string };
type Projeto = {
  id: number;
  tipo: string;
  nome: string;
  descricao: string | null;
  cliente_id: number;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  valor_orcado: string | number | null;
  valor_realizado: string | number | null;
  moeda: string;
  observacoes_financeiras: string | null;
};

export default function ProjetosPage() {
  const [list, setList] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [cobrarProjectId, setCobrarProjectId] = useState<number | null>(null);

  async function loadList() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        api<Projeto[]>("/api/v1/projetos").catch(() => []),
        api<Cliente[]>("/api/v1/clientes").catch(() => []),
      ]);
      
      // apiClient já extrai data do formato {ok: true, data: [...]}
      setList(Array.isArray(p) ? p : []);
      setClientes(Array.isArray(c) ? c : []);
    } catch (e) {
      // Silenciar erro - não quebrar UX
      setList([]);
      setClientes([]);
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
      await api(`/api/v1/projetos/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadList();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao excluir projeto";
      
      if (errorCode === "PROJECT_NOT_FOUND") {
        alert("Projeto não encontrado");
      } else {
        alert(`Erro ao excluir: ${errorMsg}`);
      }
    }
  }

  const clienteMap = Object.fromEntries(
    Array.isArray(clientes) ? clientes.map((c) => [c.id, c.nome]) : []
  );

  function formatMoeda(val: string | number | null, moeda: string) {
    if (val == null || val === "") return "-";
    const n = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(n)) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: moeda || "BRL",
    }).format(n);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-end">
        <Button asChild size="sm" className="lg:size-default">
          <Link href="/dashboard/projetos/novo">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo projeto</span>
            <span className="sm:hidden">Novo</span>
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
          ) : (
            <>
              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                {list.length > 0 ? (
                  list.map((p) => (
                    <Card key={p.id} className="border border-border/60 shadow-md hover:shadow-lg transition-shadow bg-card">
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                              <FolderKanban className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm leading-tight truncate text-foreground">{p.nome}</h3>
                              <p className="text-xs text-muted-foreground">#{p.id}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground truncate max-w-full">
                              {TIPO_LABEL[p.tipo] ?? p.tipo}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              {p.status}
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border/50 my-3" />

                        {/* Info Compact */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-foreground truncate flex-1">{clienteMap[p.cliente_id] ?? "-"}</p>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Orçado</span>
                              </div>
                              <span className="text-xs font-semibold text-foreground">{formatMoeda(p.valor_orcado, p.moeda)}</span>
                            </div>
                            {p.valor_realizado && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Realizado</span>
                                </div>
                                <span className="text-xs font-semibold text-foreground">{formatMoeda(p.valor_realizado, p.moeda)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="border-t border-border/50 mt-3 pt-3 flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 h-8 px-2" 
                            asChild
                          >
                            <Link href={`/dashboard/projetos/${p.id}`} className="flex items-center justify-center">
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2 border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground" 
                            onClick={() => setCobrarProjectId(p.id)}
                            title="Cobrar membros"
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
                            onClick={() => setDeleteId(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center">
                    <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md">
                      Comece criando seu primeiro projeto.
                    </p>
                    <Button asChild className="gap-2">
                      <Link href="/dashboard/projetos/novo">
                        <Plus className="h-4 w-4" />
                        Novo Projeto
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* Tabela para desktop - oculta */}
              <div className="hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor orçado</TableHead>
                      <TableHead className="text-right">Valor realizado</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(list) && list.length > 0 ? (
                      list.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.id}</TableCell>
                          <TableCell>{TIPO_LABEL[p.tipo] ?? p.tipo}</TableCell>
                          <TableCell>{p.nome}</TableCell>
                          <TableCell>{clienteMap[p.cliente_id] ?? "-"}</TableCell>
                          <TableCell>{p.status}</TableCell>
                          <TableCell className="text-right">{formatMoeda(p.valor_orcado, p.moeda)}</TableCell>
                          <TableCell className="text-right">{formatMoeda(p.valor_realizado, p.moeda)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/dashboard/projetos/${p.id}`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Nenhum projeto encontrado
                        </TableCell>
                      </TableRow>
                    )}
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
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
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

      {cobrarProjectId && (
        <CobrarModal
          open={!!cobrarProjectId}
          onOpenChange={(open) => {
            if (!open) setCobrarProjectId(null);
          }}
          projectId={cobrarProjectId}
          projectName={list.find((p) => p.id === cobrarProjectId)?.nome || "Projeto"}
        />
      )}
    </motion.div>
  );
}
