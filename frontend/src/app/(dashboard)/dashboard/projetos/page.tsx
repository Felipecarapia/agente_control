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
import { Plus, Pencil, Trash2 } from "lucide-react";

const TIPO_LABEL: Record<string, string> = {
  desenvolvimento_software: "Desenvolvimento de software",
  marketing: "Marketing",
  infoproduto: "Infoproduto",
  lancamento: "Lançamento",
};

type Cliente = { id: string; nome: string };
type Projeto = {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  cliente_id: string;
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
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function loadList() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        api<Projeto[]>("/api/v1/projetos"),
        api<Cliente[]>("/api/v1/clientes"),
      ]);
      setList(p);
      setClientes(c);
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/dashboard/projetos/novo">
            <Plus className="h-4 w-4" />
            Novo projeto
          </Link>
        </Button>
      </div>

      <Card className="shadow-sm border-border/80">
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
                {list.map((p) => (
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
                ))}
              </TableBody>
            </Table>
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
    </motion.div>
  );
}
