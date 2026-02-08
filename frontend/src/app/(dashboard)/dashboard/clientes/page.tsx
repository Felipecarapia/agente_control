"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Plus, Pencil, Trash2, UserCircle, Mail, Phone, MapPin, Building2 } from "lucide-react";
import { CardSkeleton } from "@/components/ui/card-skeleton";

type Cliente = {
  id: number;
  tipo: string;
  nome: string;
  razao_social: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cidade: string | null;
  estado: string | null;
};

export default function ClientesPage() {
  const router = useRouter();
  const [list, setList] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function loadList() {
    setLoading(true);
    try {
      const response = await api<any>("/api/v1/clientes");
      // Verificar se resposta está no formato padronizado
      const data = response?.ok === true ? (response.data || []) : (Array.isArray(response) ? response : []);
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorCode = (e as any)?.code || "UNKNOWN";
      console.error("Erro ao carregar clientes:", {
        message: errorMsg,
        code: errorCode,
        error: e,
      });
      setList([]); // Garantir que lista seja array vazio em caso de erro
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
      await api(`/api/v1/clientes/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadList();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-end">
        <Button asChild size="sm" className="lg:size-default">
          <Link href="/dashboard/clientes/novo">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo cliente</span>
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
                {list.map((c) => (
                  <Card key={c.id} className="border border-border/60 shadow-md hover:shadow-lg transition-shadow bg-card">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                            {c.tipo === "pj" ? (
                              <Building2 className="h-4 w-4" />
                            ) : (
                              <UserCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-tight truncate text-foreground">{c.nome}</h3>
                            <p className="text-xs text-muted-foreground">#{c.id}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                          {c.tipo === "pj" ? "PJ" : "PF"}
                        </span>
                      </div>

                      {/* Divider */}
                      {(c.email || c.telefone || c.celular || c.cidade) && (
                        <div className="border-t border-border/50 my-3" />
                      )}

                      {/* Info Compact */}
                      <div className="space-y-2">
                        {c.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-foreground truncate flex-1">{c.email}</p>
                          </div>
                        )}
                        {(c.telefone || c.celular) && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-foreground truncate flex-1">{c.telefone ?? c.celular}</p>
                          </div>
                        )}
                        {c.cidade && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-foreground truncate flex-1">{c.cidade}{c.estado ? `, ${c.estado}` : ""}</p>
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
                          <Link href={`/dashboard/clientes/${c.id}`} className="flex items-center justify-center">
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => setDeleteId(c.id)}
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="w-[120px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.id}</TableCell>
                        <TableCell>{c.tipo === "pj" ? "PJ" : "PF"}</TableCell>
                        <TableCell>{c.nome}</TableCell>
                        <TableCell>{c.email ?? "-"}</TableCell>
                        <TableCell>{c.telefone ?? c.celular ?? "-"}</TableCell>
                        <TableCell>{c.cidade ?? "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/dashboard/clientes/${c.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(c.id)}
                            >
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
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
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
