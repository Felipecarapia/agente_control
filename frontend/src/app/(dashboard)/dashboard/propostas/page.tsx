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
        api<Proposta[]>("/api/v1/propostas"),
        api<Cliente[]>("/api/v1/clientes"),
        api<Projeto[]>("/api/v1/projetos"),
      ]);
      setList(p);
      setClientes(c);
      setProjetos(pr);
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
      await api(`/api/v1/propostas/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadList();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erro ao excluir");
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/dashboard/propostas/novo">
            <Plus className="h-4 w-4" />
            Nova proposta
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
