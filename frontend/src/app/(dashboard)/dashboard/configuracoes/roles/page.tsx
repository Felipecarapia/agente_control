"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, Pencil, Trash2, Shield, CheckSquare, Square, Key } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Permission = {
  id: string;
  module: string;
  action: string;
  name: string;
  description: string | null;
};

type Role = {
  id: string;
  key: string;
  name: string;
  created_at: string;
  permissions?: Permission[];
};

type PermissionsByModule = {
  [module: string]: Permission[];
};

const MODULE_LABELS: Record<string, string> = {
  clientes: "Clientes",
  projetos: "Projetos",
  tarefas: "Tarefas",
  propostas: "Propostas",
  contratos: "Contratos",
  usuarios: "Usuários",
  notificacoes: "Notificações",
  mensagens: "Mensagens",
  roles: "Roles e Permissões",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Criar",
  read: "Visualizar",
  update: "Editar",
  delete: "Excluir",
  nudge: "Cobrar",
  upload: "Upload",
  send: "Enviar",
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionsByModule>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [form, setForm] = useState({ key: "", name: "" });
  
  // Estados para CRUD de Permissões
  const [allPermissionsList, setAllPermissionsList] = useState<Permission[]>([]);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [permissionEditId, setPermissionEditId] = useState<number | null>(null);
  const [permissionDeleteId, setPermissionDeleteId] = useState<number | null>(null);
  const [permissionForm, setPermissionForm] = useState({
    module: "",
    action: "",
    name: "",
    description: "",
  });
  const [activeTab, setActiveTab] = useState("roles");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [rolesData, permissionsData, allPermsData] = await Promise.all([
        api<Role[]>("/api/v1/roles").catch(() => []),
        api<PermissionsByModule>("/api/v1/roles/permissions/by-module").catch(() => ({})),
        api<Permission[]>("/api/v1/roles/permissions/all").catch(() => []),
      ]);
      
      // apiClient já extrai data do formato {ok: true, data: [...]}
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setPermissions(typeof permissionsData === "object" && permissionsData !== null ? (permissionsData as PermissionsByModule) : {});
      setAllPermissionsList(Array.isArray(allPermsData) ? allPermsData : []);
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const status = e?.status || 0;
      
      // Se for erro de autenticação, redirecionar
      if (errorCode === "UNAUTHORIZED" || status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return;
      }
      
      // Silenciar outros erros - não quebrar UX
      setPermissions({});
      setRoles([]);
      setAllPermissionsList([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditId(null);
    setForm({ key: "", name: "" });
    setOpen(true);
  }

  function openEdit(role: Role) {
    setEditId(role.id);
    setForm({ key: role.key, name: role.name });
    setOpen(true);
  }

  async function openPermissions(role: Role) {
    setSelectedRoleId(role.id);
    try {
      // Carregar role com permissões atualizadas
      const roleWithPerms = await api<any>(`/api/v1/roles/${role.id}`);
      // O api-client já extrai o data do formato padronizado
      const perms = roleWithPerms?.permissions || [];
      setSelectedPermissions(new Set(perms.map((p: Permission) => p.id)));
      setPermissionsOpen(true);
    } catch (e: any) {
      // Silenciar erro - abrir modal mesmo sem permissões
      setSelectedPermissions(new Set());
      setPermissionsOpen(true);
    }
  }

  async function save() {
    try {
      if (editId) {
        await api(`/api/v1/roles/${editId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: form.name }),
        });
      } else {
        await api("/api/v1/roles", {
          method: "POST",
          body: JSON.stringify({ key: form.key, name: form.name }),
        });
      }
      setOpen(false);
      loadData();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao salvar role";
      
      if (errorCode === "VALIDATION_ERROR") {
        alert("Dados inválidos. Verifique os campos obrigatórios.");
      } else if (errorCode === "ROLE_DUPLICATE") {
        alert(`Role duplicada: ${errorMsg}`);
      } else if (errorCode === "FORBIDDEN" || e?.status === 403) {
        alert("Você não tem permissão para criar/editar roles.");
      } else {
        alert(`Erro ao salvar: ${errorMsg}`);
      }
    }
  }

  async function savePermissions() {
    if (!selectedRoleId) return;
    
    // Snapshot para rollback
    const previousPermissions = new Set(selectedPermissions);
    
    try {
      await api(`/api/v1/roles/${selectedRoleId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permission_ids: Array.from(selectedPermissions) }),
      });
      setPermissionsOpen(false);
      loadData();
    } catch (e: any) {
      // Rollback: restaurar permissões anteriores
      setSelectedPermissions(previousPermissions);
      
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao salvar permissões";
      
      if (errorCode === "VALIDATION_ERROR") {
        alert("Dados inválidos. Verifique as permissões selecionadas.");
      } else if (errorCode === "ROLE_NOT_FOUND") {
        alert("Role não encontrada.");
      } else if (errorCode === "PERMISSIONS_NOT_FOUND") {
        alert(`Algumas permissões não foram encontradas: ${errorMsg}`);
      } else if (errorCode === "FORBIDDEN" || e?.status === 403) {
        alert("Você não tem permissão para gerenciar permissões.");
      } else {
        alert(`Erro ao salvar permissões: ${errorMsg}`);
      }
    }
  }

  async function removeRole() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/roles/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      await loadData();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao excluir role";
      
      if (errorCode === "ROLE_NOT_FOUND") {
        alert("Role não encontrada.");
      } else if (errorCode === "FORBIDDEN" || e?.status === 403) {
        alert("Você não tem permissão para excluir roles.");
      } else {
        alert(`Erro ao excluir: ${errorMsg}`);
      }
    }
  }

  function togglePermission(permissionId: number) {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  }

  function toggleAllInModule(module: string) {
    const modulePermissions = permissions[module] || [];
    const allSelected = modulePermissions.every((p) => selectedPermissions.has(p.id));
    
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Desmarcar todas
        modulePermissions.forEach((p) => newSet.delete(p.id));
      } else {
        // Marcar todas
        modulePermissions.forEach((p) => newSet.add(p.id));
      }
      return newSet;
    });
  }

  // Funções para CRUD de Permissões
  function openPermissionCreate() {
    setPermissionEditId(null);
    setPermissionForm({ module: "", action: "", name: "", description: "" });
    setPermissionOpen(true);
  }

  function openPermissionEdit(perm: Permission) {
    setPermissionEditId(perm.id);
    setPermissionForm({
      module: perm.module,
      action: perm.action,
      name: perm.name,
      description: perm.description || "",
    });
    setPermissionOpen(true);
  }

  async function savePermission() {
    try {
      if (permissionEditId) {
        await api(`/api/v1/roles/permissions/${permissionEditId}`, {
          method: "PATCH",
          body: JSON.stringify(permissionForm),
        });
      } else {
        await api("/api/v1/roles/permissions", {
          method: "POST",
          body: JSON.stringify(permissionForm),
        });
      }
      setPermissionOpen(false);
      loadData();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao salvar permissão";
      
      if (errorCode === "VALIDATION_ERROR") {
        alert("Dados inválidos. Verifique os campos obrigatórios.");
      } else if (errorCode === "PERMISSION_DUPLICATE") {
        alert(`Permissão duplicada: ${errorMsg}`);
      } else if (errorCode === "FORBIDDEN" || e?.status === 403) {
        alert("Você não tem permissão para criar/editar permissões.");
      } else {
        alert(`Erro ao salvar: ${errorMsg}`);
      }
    }
  }

  async function removePermission() {
    if (!permissionDeleteId) return;
    try {
      await api(`/api/v1/roles/permissions/${permissionDeleteId}`, { method: "DELETE" });
      setPermissionDeleteId(null);
      loadData();
    } catch (e: any) {
      const errorCode = e?.code || "UNKNOWN";
      const errorMsg = e?.message || "Erro ao excluir permissão";
      
      if (errorCode === "PERMISSION_NOT_FOUND") {
        alert("Permissão não encontrada.");
      } else if (errorCode === "FORBIDDEN" || e?.status === 403) {
        alert("Você não tem permissão para excluir permissões.");
      } else {
        alert(`Erro ao excluir: ${errorMsg}`);
      }
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles e Permissões</h1>
          <p className="text-muted-foreground">Gerencie roles e permissões do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadData()}>
            Atualizar
          </Button>
          {activeTab === "roles" && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nova Role
            </Button>
          )}
          {activeTab === "permissions" && (
            <Button onClick={openPermissionCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nova Permissão
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-2" /> Roles
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Key className="h-4 w-4 mr-2" /> Permissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6 mt-6">
          <Card>
        <CardHeader>
          <CardTitle>Lista de Roles</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          {loading ? (
            <p className="p-4 text-muted-foreground">Carregando...</p>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma role encontrada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Comece criando sua primeira role.
              </p>
              <Button onClick={openCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova role
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {roles.map((role) => (
                <div key={role.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{role.name}</h3>
                          <p className="text-sm text-muted-foreground">Key: {role.key}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {role.permissions?.length || 0} permissão(ões) atribuída(s)
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPermissions(role);
                        }}
                        className="h-8"
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Permissões
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(role);
                        }}
                        title="Editar role"
                        className="h-8 w-8 hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(role.id)}
                        title="Excluir role"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20 hover:border-destructive/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Permissões</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {loading ? (
                <p className="p-4 text-muted-foreground">Carregando...</p>
              ) : Object.keys(permissions).length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p className="font-medium mb-2">Nenhuma permissão encontrada.</p>
                  <p className="text-sm mb-2">
                    Execute no backend:
                  </p>
                  <div className="mt-2 space-y-1 mb-4">
                    <code className="bg-muted px-2 py-1 rounded text-xs block">alembic upgrade head</code>
                    <code className="bg-muted px-2 py-1 rounded text-xs block">python -m app.seed</code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadData()}
                  >
                    Tentar novamente
                  </Button>
                  <p className="text-xs mt-4 text-muted-foreground">
                    Verifique o console do navegador (F12) para mais detalhes
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {Object.entries(permissions).map(([module, modulePermissions]) => (
                    <div key={module} className="p-4">
                      <h3 className="font-semibold text-lg mb-3">
                        {MODULE_LABELS[module] || module.charAt(0).toUpperCase() + module.slice(1)}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {modulePermissions.map((perm) => (
                          <div
                            key={perm.id}
                            className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{perm.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {perm.description || `${ACTION_LABELS[perm.action] || perm.action} em ${MODULE_LABELS[perm.module] || perm.module}`}
                              </p>
                              <div className="flex gap-1 mt-2">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {perm.module}
                                </span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {perm.action}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openPermissionEdit(perm)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPermissionDeleteId(perm.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Criar/Editar Role */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Role" : "Nova Role"}</DialogTitle>
            <DialogDescription>
              {editId
                ? "Atualize o nome da role"
                : "Crie uma nova role. A key será convertida para maiúsculas automaticamente."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="key">Key (identificador único)</Label>
              <Input
                id="key"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                disabled={!!editId}
                placeholder="Ex: CUSTOM_ROLE"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nome (exibido)</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Role Personalizada"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Permissões */}
      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">Gerenciar Permissões</DialogTitle>
            <DialogDescription>
              Selecione as permissões que esta role terá acesso. Organizadas por módulo.
            </DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-medium text-muted-foreground">
                {selectedPermissions.size} de {Object.values(permissions).flat().length} selecionada(s)
              </span>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {Object.keys(permissions).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium mb-2">Nenhuma permissão encontrada.</p>
                <p className="text-sm mb-2">
                  Execute no backend:
                </p>
                <div className="space-y-1 mb-4">
                  <code className="bg-muted px-2 py-1 rounded text-xs block">alembic upgrade head</code>
                  <code className="bg-muted px-2 py-1 rounded text-xs block">python -m app.seed</code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadData();
                    setPermissionsOpen(false);
                    setTimeout(() => setPermissionsOpen(true), 100);
                  }}
                >
                  Recarregar
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(permissions).map(([module, modulePermissions]) => {
                  const allSelected = modulePermissions.every((p) => selectedPermissions.has(p.id));
                  const someSelected = modulePermissions.some((p) => selectedPermissions.has(p.id));
                  
                  return (
                    <div
                      key={module}
                      className="border rounded-xl overflow-hidden bg-gradient-to-br from-card to-card/50 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Header do Módulo */}
                      <div className="bg-muted/30 px-5 py-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-bold text-lg">
                              {MODULE_LABELS[module]?.[0] || module[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-base flex items-center gap-2">
                              {MODULE_LABELS[module] || module.charAt(0).toUpperCase() + module.slice(1)}
                              <span className="text-xs font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                                {modulePermissions.length}
                              </span>
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {modulePermissions.filter((p) => selectedPermissions.has(p.id)).length} de {modulePermissions.length} selecionada(s)
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={allSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleAllInModule(module)}
                          className="h-8"
                        >
                          {allSelected ? (
                            <>
                              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                              Desmarcar todas
                            </>
                          ) : (
                            <>
                              <Square className="h-3.5 w-3.5 mr-1.5" />
                              Marcar todas
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Grid de Permissões */}
                      <div className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {modulePermissions.map((perm) => {
                            const isSelected = selectedPermissions.has(perm.id);
                            return (
                              <div
                                key={perm.id}
                                className={`group relative flex flex-col p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? "bg-primary/5 border-primary/30 shadow-sm"
                                    : "bg-background border-border hover:border-primary/20 hover:bg-muted/30"
                                }`}
                                onClick={() => togglePermission(perm.id)}
                              >
                                <div className="flex items-start gap-3 mb-2">
                                  <Checkbox
                                    id={`perm-${perm.id}`}
                                    checked={isSelected}
                                    onCheckedChange={() => togglePermission(perm.id)}
                                    className="mt-0.5 flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <Label
                                      htmlFor={`perm-${perm.id}`}
                                      className={`font-semibold text-sm cursor-pointer block leading-tight ${
                                        isSelected ? "text-primary" : "text-foreground"
                                      }`}
                                    >
                                      {perm.name}
                                    </Label>
                                  </div>
                                </div>
                                
                                <p className="text-xs text-muted-foreground mb-3 leading-relaxed pl-7">
                                  {perm.description || `${ACTION_LABELS[perm.action] || perm.action} em ${MODULE_LABELS[perm.module] || perm.module}`}
                                </p>
                                
                                <div className="flex gap-1.5 pl-7 flex-wrap">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 text-muted-foreground border border-border/50">
                                    {perm.module}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                                    {perm.action}
                                  </span>
                                </div>
                                
                                {isSelected && (
                                  <div className="absolute top-2 right-2">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
                <span>
                  <strong className="text-foreground">{selectedPermissions.size}</strong> permissões selecionadas
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPermissionsOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={savePermissions} className="min-w-[140px]">
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Salvar ({selectedPermissions.size})
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Excluir Role */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir role?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A role será removida de todos os usuários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Criar/Editar Permissão */}
      <Dialog open={permissionOpen} onOpenChange={setPermissionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{permissionEditId ? "Editar Permissão" : "Nova Permissão"}</DialogTitle>
            <DialogDescription>
              {permissionEditId
                ? "Atualize os dados da permissão"
                : "Crie uma nova permissão para o sistema"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="perm-module">Módulo</Label>
              <Input
                id="perm-module"
                value={permissionForm.module}
                onChange={(e) => setPermissionForm((f) => ({ ...f, module: e.target.value }))}
                placeholder="Ex: clientes, projetos, tarefas"
                disabled={!!permissionEditId}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="perm-action">Ação</Label>
              <Input
                id="perm-action"
                value={permissionForm.action}
                onChange={(e) => setPermissionForm((f) => ({ ...f, action: e.target.value }))}
                placeholder="Ex: create, read, update, delete"
                disabled={!!permissionEditId}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="perm-name">Nome</Label>
              <Input
                id="perm-name"
                value={permissionForm.name}
                onChange={(e) => setPermissionForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Criar Clientes"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="perm-description">Descrição (opcional)</Label>
              <Textarea
                id="perm-description"
                value={permissionForm.description}
                onChange={(e) => setPermissionForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição detalhada da permissão"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={savePermission}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Excluir Permissão */}
      <AlertDialog open={!!permissionDeleteId} onOpenChange={() => setPermissionDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permissão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A permissão será removida de todas as roles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={removePermission}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

