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
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type Role = {
  id: string;
  key: string;
  name: string;
};

type Usuario = {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  roles?: Role[];
  created_at?: string;
  updated_at?: string;
};

export default function UsuariosPage() {
  const [list, setList] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", nome: "", password: "", ativo: true });

  const [hasPermission, setHasPermission] = useState(true);

  async function loadList() {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        api<Usuario[]>("/api/v1/usuarios"),
        api<Role[]>("/api/v1/roles").catch(() => []),
      ]);
      // apiClient já extrai data do formato {ok: true, data: [...]}
      setList(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setHasPermission(true);
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const status = e?.status || 0;

      // Se for 403, usuário não tem permissão
      if (status === 403 || errorCode === "FORBIDDEN") {
        setHasPermission(false);
        setList([]);
        setRoles([]);
      } else {
        // Outros erros: silenciar e mostrar lista vazia
        setList([]);
        setRoles([]);
        setHasPermission(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({ email: "", nome: "", password: "", ativo: true });
    setOpen(true);
  }

  function openEdit(u: Usuario) {
    setEditId(u.id);
    setForm({ email: u.email, nome: u.nome, password: "", ativo: u.ativo });
    setOpen(true);
  }

  async function save() {
    try {
      if (editId) {
        const body: Record<string, unknown> = { email: form.email, nome: form.nome, ativo: form.ativo };
        if (form.password) body.password = form.password;
        await api(`/api/v1/usuarios/${editId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/api/v1/usuarios", {
          method: "POST",
          body: JSON.stringify({ email: form.email, nome: form.nome, password: form.password, ativo: form.ativo }),
        });
      }
      setOpen(false);
      loadList();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao salvar usuário";

      if (errorCode === "VALIDATION_ERROR") {
        alert("Dados inválidos. Verifique os campos obrigatórios.");
      } else if (errorCode === "EMAIL_ALREADY_EXISTS") {
        alert(`Email já cadastrado: ${errorMsg}`);
      } else if (errorCode === "FORBIDDEN" || e?.status === 403) {
        alert("Você não tem permissão para criar/editar usuários.");
      } else {
        alert(`Erro ao salvar: ${errorMsg}`);
      }
    }
  }

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/usuarios/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadList();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao excluir usuário";

      if (errorCode === "USER_NOT_FOUND") {
        alert("Usuário não encontrado.");
      } else if (errorCode === "CANNOT_DELETE_SELF") {
        alert("Não é possível deletar seu próprio usuário.");
      } else if (errorCode === "FORBIDDEN" || e?.status === 403) {
        alert("Você não tem permissão para deletar usuários.");
      } else {
        alert(`Erro ao excluir: ${errorMsg}`);
      }
    }
  }

  async function openRolesModal(user: Usuario) {
    setSelectedUserId(user.id);
    try {
      const userRolesData = await api<{ user_id: string; roles: Role[] }>(`/api/v1/roles/users/${user.id}`);
      setSelectedUserRoles(new Set(userRolesData.roles.map((r) => r.id)));
      setRolesOpen(true);
    } catch (e: any) {
      // Silenciar erro - abrir modal mesmo sem roles
      setSelectedUserRoles(new Set());
      setRolesOpen(true);
    }
  }

  function toggleRole(roleId: string) {
    setSelectedUserRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  }

  async function saveUserRoles() {
    if (!selectedUserId) return;
    try {
      // Obter roles atuais do usuário
      const currentRoles = await api<{ user_id: string; roles: Role[] }>(`/api/v1/roles/users/${selectedUserId}`);
      const currentRoleIds = new Set(currentRoles.roles.map((r) => r.id));

      // Adicionar novos roles
      for (const roleId of selectedUserRoles) {
        if (!currentRoleIds.has(roleId)) {
          await api(`/api/v1/roles/users/${selectedUserId}/assign`, {
            method: "POST",
            body: JSON.stringify({ role_id: roleId }),
          });
        }
      }

      // Remover roles desmarcados
      for (const roleId of currentRoleIds) {
        if (!selectedUserRoles.has(roleId)) {
          await api(`/api/v1/roles/users/${selectedUserId}/remove/${roleId}`, {
            method: "DELETE",
          });
        }
      }

      setRolesOpen(false);
      setSelectedUserId(null);
      loadList();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao salvar cargos";

      if (errorCode === "FORBIDDEN" || e?.status === 403) {
        alert("Você não tem permissão para gerenciar cargos.");
      } else {
        alert(`Erro ao salvar cargos: ${errorMsg}`);
      }
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo usuário</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Lista</CardTitle></CardHeader>
        <CardContent className="p-0 pt-0">
          {loading ? (
            <p className="p-4 text-muted-foreground">Carregando...</p>
          ) : !hasPermission ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Sem permissão</h3>
              <p className="text-sm text-muted-foreground">
                Você não tem permissão para visualizar usuários. Entre em contato com um administrador.
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Comece criando seu primeiro usuário.
              </p>
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo usuário
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Cargos</TableHead>
                  <TableHead className="w-[200px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.nome}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.ativo ? "Sim" : "Não"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles && u.roles.length > 0 ? (
                          u.roles.map((role) => (
                            <span
                              key={role.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                            >
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openRolesModal(u)} title="Gerenciar cargos"><Shield className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? "Editar usuário" : "Novo usuário"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="nome">Nome</Label><Input id="nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} /></div>
            <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={!!editId} /></div>
            <div className="grid gap-2"><Label htmlFor="password">Senha {editId && "(deixe em branco para não alterar)"}</Label><Input id="password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><input type="checkbox" id="ativo" checked={form.ativo} onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))} className="rounded border-input" /><Label htmlFor="ativo">Ativo</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir usuário?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Gerenciar Cargos */}
      <Dialog open={rolesOpen} onOpenChange={(open) => {
        setRolesOpen(open);
        if (!open) {
          setSelectedUserId(null);
          setSelectedUserRoles(new Set());
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar Cargos</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selecione os cargos para o usuário: <strong>{list.find((u) => u.id === selectedUserId)?.nome}</strong>
            </p>
            <div className="border rounded-md p-4 max-h-96 overflow-y-auto space-y-3">
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum cargo disponível. Crie cargos em "Roles e Permissões".
                </p>
              ) : (
                roles.map((role) => (
                  <div key={role.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                    <Checkbox
                      checked={selectedUserRoles.has(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <div className="flex-1">
                      <Label className="text-sm font-medium cursor-pointer" onClick={() => toggleRole(role.id)}>
                        {role.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">Key: {role.key}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolesOpen(false)}>Cancelar</Button>
            <Button onClick={saveUserRoles}>Salvar Cargos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
