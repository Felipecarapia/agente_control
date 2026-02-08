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
import { Plus, Pencil, Trash2, ListTodo, FolderKanban, User, Calendar, Flag, Repeat, Bell } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CobrarModal } from "@/components/tarefas/CobrarModal";
import { TasksViewSwitcher, TasksView } from "@/components/tarefas/TasksViewSwitcher";
import { TasksAgendaView } from "@/components/tarefas/TasksAgendaView";
import { TasksCalendarView } from "@/components/tarefas/TasksCalendarView";
import { TasksKanbanView } from "@/components/tarefas/TasksKanbanView";
import { TasksTableView } from "@/components/tarefas/TasksTableView";
import { TaskDrawer } from "@/components/tarefas/TaskDrawer";
import { useToast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";

type Projeto = { id: number; nome: string };
type Usuario = { 
  id: number; 
  nome: string;
  roles?: Array<{ id: number; key: string; name: string }>;
};
type Tarefa = {
  id: number;
  titulo: string;
  descricao: string | null;
  projeto_id: number;
  status: string;
  prioridade: string | null;
  responsavel_id: number | null;
  data_vencimento: string | null;
  is_recurring?: boolean;
  recurrence_type?: string | null;
  recurrence_interval?: number | null;
  recurrence_end_date?: string | null;
  parent_task_id?: number | null;
  assigned_user_ids?: number[];
  assigned_users?: Array<{ id: number; usuario_id: number; usuario_nome: string | null }>;
};

export default function TarefasPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [list, setList] = useState<Tarefa[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [cobrarTaskId, setCobrarTaskId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskDatabase, setTaskDatabase] = useState<any>(null);
  const [taskProperties, setTaskProperties] = useState<any[]>([]);
  
  // Estado de visualização (persistido no localStorage e query params)
  const [view, setView] = useState<TasksView>(() => {
    if (typeof window === "undefined") return "list";
    const urlView = searchParams?.get("view") as TasksView;
    if (urlView && ["list", "agenda", "calendar", "kanban", "table"].includes(urlView)) {
      return urlView;
    }
    const saved = localStorage.getItem("tarefas_view") as TasksView;
    return saved || "list";
  });
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    projeto_id: 0,
    status: "pendente",
    prioridade: "",
    responsavel_id: 0,
    data_vencimento: "",
    is_recurring: false,
    recurrence_type: "diaria",
    recurrence_interval: 1,
    recurrence_end_date: "",
    assigned_user_ids: [] as number[],
  });

  async function load() {
    setLoading(true);
    try {
      const [t, p, u] = await Promise.all([
        api<Tarefa[]>("/api/v1/tarefas").catch(() => []),
        api<Projeto[]>("/api/v1/projetos").catch(() => []),
        api<Usuario[]>("/api/v1/usuarios").catch(() => []),
      ]);
      
      setList(Array.isArray(t) ? t : []);
      setProjetos(Array.isArray(p) ? p : []);
      setUsuarios(Array.isArray(u) ? u : []);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const errorCode = (e as any)?.code || "UNKNOWN";
      console.error("Erro ao carregar tarefas:", {
        message: errorMsg,
        code: errorCode,
        error: e,
      });
      setList([]);
      setProjetos([]);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadTaskDatabase() {
    try {
      // Tentar carregar database padrão - se não existir, retorna null silenciosamente
      const db = await api<any>("/api/v1/task-notion/databases/default").catch(() => null);
      const props = await api<any[]>("/api/v1/task-notion/databases/default/properties").catch(() => []);
      
      // Se db for null, não há database padrão (normal se não foi criado ainda)
      if (db) {
        setTaskDatabase(db);
      } else {
        setTaskDatabase(null);
      }
      setTaskProperties(Array.isArray(props) ? props : []);
    } catch (e) {
      // Silenciar todos os erros - é esperado que não exista database padrão
      setTaskDatabase(null);
      setTaskProperties([]);
    }
  }

  useEffect(() => {
    load();
    loadTaskDatabase();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm({
      titulo: "",
      descricao: "",
      projeto_id: projetos[0]?.id ?? 0,
      status: "pendente",
      prioridade: "",
      responsavel_id: 0,
      data_vencimento: "",
      is_recurring: false,
      recurrence_type: "diaria",
      recurrence_interval: 1,
      recurrence_end_date: "",
      assigned_user_ids: [],
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
      responsavel_id: t.responsavel_id ?? 0,
      data_vencimento: t.data_vencimento || "",
      is_recurring: t.is_recurring || false,
      recurrence_type: t.recurrence_type || "diaria",
      recurrence_interval: t.recurrence_interval || 1,
      recurrence_end_date: t.recurrence_end_date || "",
      assigned_user_ids: t.assigned_user_ids || [],
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
        is_recurring: form.is_recurring,
        recurrence_type: form.is_recurring ? form.recurrence_type : null,
        recurrence_interval: form.is_recurring ? form.recurrence_interval : null,
        recurrence_end_date: form.is_recurring && form.recurrence_end_date ? form.recurrence_end_date : null,
        assigned_user_ids: form.assigned_user_ids,
      };
      if (editId) {
        await api(`/api/v1/tarefas/${editId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/api/v1/tarefas", { method: "POST", body: JSON.stringify(body) });
      }
      setOpen(false);
      toast({
        title: "Sucesso",
        description: editId ? "Tarefa atualizada com sucesso" : "Tarefa criada com sucesso",
      });
      load();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Erro ao salvar";
      console.error("Erro ao salvar tarefa:", e);
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      });
    }
  }

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/tarefas/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso",
      });
      load();
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Erro ao excluir";
      console.error("Erro ao excluir tarefa:", e);
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      });
    }
  }

  async function handleToggleComplete(id: number) {
    const task = list.find((t) => t.id === id);
    if (!task) return;

    const previousStatus = task.status;
    // Otimista: atualizar UI imediatamente
    setList((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "concluida" ? "pendente" : "concluida" }
          : t
      )
    );

    try {
      await api(`/api/v1/tarefas/${id}/toggle-status`, { method: "POST" });
      toast({
        title: "Sucesso",
        description: `Tarefa ${previousStatus === "concluida" ? "reaberta" : "concluída"}`,
      });
      // Recarregar para garantir sincronização
      load();
    } catch (e) {
      // Reverter em caso de erro
      setList((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: previousStatus } : t))
      );
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Erro ao atualizar tarefa",
        variant: "destructive",
      });
    }
  }

  function handleViewChange(newView: TasksView) {
    setView(newView);
    if (typeof window !== "undefined") {
      localStorage.setItem("tarefas_view", newView);
      // Atualizar URL sem recarregar a página
      const url = new URL(window.location.href);
      url.searchParams.set("view", newView);
      router.push(url.pathname + url.search, { scroll: false });
    }
  }

  function handleTaskClick(id: number) {
    openEdit(list.find((t) => t.id === id)!);
  }

  function handleCreateTaskForDate(date: Date) {
    const dateStr = date.toISOString().split("T")[0];
    setForm({
      titulo: "",
      descricao: "",
      projeto_id: projetos[0]?.id ?? 0,
      status: "pendente",
      prioridade: "",
      responsavel_id: 0,
      data_vencimento: dateStr,
      is_recurring: false,
      recurrence_type: "diaria",
      recurrence_interval: 1,
      recurrence_end_date: "",
      assigned_user_ids: [],
    });
    setEditId(null);
    setOpen(true);
  }

  const projetoMap = Object.fromEntries(projetos.map((p) => [p.id, p.nome]));
  const usuarioMap = Object.fromEntries(usuarios.map((u) => [u.id, u.nome]));
  
  // Filtrar usuários do marketing
  const marketingUsers = usuarios.filter((u) => 
    u.roles?.some((r) => r.key === "MARKETING" || r.key === "MARKETING_MANAGER")
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Gerencie as tarefas</p>
        </div>
        <div className="flex items-center gap-3">
          <TasksViewSwitcher view={view} onViewChange={handleViewChange} />
          <Button onClick={openCreate} disabled={projetos.length === 0} size="sm" className="lg:size-default">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova tarefa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Renderizar visualização selecionada */}
      {view === "agenda" && (
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Agenda Semanal</CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <TasksAgendaView
              projetos={projetos}
              usuarios={usuarios}
              onToggleComplete={handleToggleComplete}
              onTaskClick={handleTaskClick}
            />
          </CardContent>
        </Card>
      )}

      {view === "calendar" && (
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Calendário Mensal</CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <TasksCalendarView
              projetos={projetos}
              usuarios={usuarios}
              onToggleComplete={handleToggleComplete}
              onTaskClick={handleTaskClick}
              onCreateTask={handleCreateTaskForDate}
            />
          </CardContent>
        </Card>
      )}

      {view === "kanban" && (
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Kanban</CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <TasksKanbanView
              projetos={projetos}
              usuarios={usuarios}
              onToggleComplete={handleToggleComplete}
              onTaskClick={handleTaskClick}
              onCreateTask={openCreate}
            />
          </CardContent>
        </Card>
      )}

      {view === "table" && (
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Tabela (Database)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            {taskDatabase ? (
              <TasksTableView
                databaseId={taskDatabase.id}
                properties={taskProperties}
                onTaskClick={(id) => setSelectedTaskId(id)}
                onToggleComplete={handleToggleComplete}
                onCreateTask={() => setOpen(true)}
              />
            ) : (
              <p className="text-muted-foreground">Carregando database...</p>
            )}
          </CardContent>
        </Card>
      )}

      {view === "list" && (
        <Card>
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-lg">Lista</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            {loading ? (
              <p className="p-4 text-muted-foreground">Carregando...</p>
            ) : list.length === 0 ? (
              <div className="p-8 text-center">
                <ListTodo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {projetos.length === 0 
                    ? "Crie um projeto primeiro para começar a adicionar tarefas."
                    : "Comece criando sua primeira tarefa."}
                </p>
                {projetos.length > 0 && (
                  <Button onClick={openCreate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova tarefa
                  </Button>
                )}
              </div>
            ) : (
            <>
              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                {list.map((t) => (
                  <Card key={t.id} className="border border-border/60 shadow-md hover:shadow-lg transition-shadow bg-card">
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                            <ListTodo className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-tight truncate text-foreground">{t.titulo}</h3>
                            <p className="text-xs text-muted-foreground">#{t.id}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {t.status}
                        </span>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/50 my-3" />

                      {/* Info Compact */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-foreground truncate flex-1">{projetoMap[t.projeto_id] ?? "-"}</p>
                        </div>
                        {t.responsavel_id && (
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-foreground truncate flex-1">{usuarioMap[t.responsavel_id] ?? "-"}</p>
                          </div>
                        )}
                        {t.data_vencimento && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-foreground">
                              {new Date(t.data_vencimento).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="border-t border-border/50 mt-3 pt-3 flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2" 
                          onClick={() => openEdit(t)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2" 
                          onClick={() => setCobrarTaskId(t.id)}
                          title="Cobrar"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" 
                          onClick={() => setDeleteId(t.id)}
                          title="Excluir"
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
              </div>
            </>
            )}
          </CardContent>
        </Card>
      )}

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
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Projeto</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.projeto_id}
                onChange={(e) => setForm((f) => ({ ...f, projeto_id: Number(e.target.value) }))}
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
                onChange={(e) => setForm((f) => ({ ...f, responsavel_id: Number(e.target.value) }))}
              >
                <option value={0}>Nenhum</option>
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
            
            {/* Seleção múltipla de usuários (especialmente marketing) */}
            <div className="grid gap-2">
              <Label>Atribuir a usuários (Marketing)</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {marketingUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum usuário de marketing encontrado</p>
                ) : (
                  marketingUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={form.assigned_user_ids.includes(u.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setForm((f) => ({ ...f, assigned_user_ids: [...f.assigned_user_ids, u.id] }));
                          } else {
                            setForm((f) => ({ ...f, assigned_user_ids: f.assigned_user_ids.filter((id) => id !== u.id) }));
                          }
                        }}
                      />
                      <Label className="text-sm font-normal cursor-pointer">{u.nome}</Label>
                    </div>
                  ))
                )}
              </div>
              {marketingUsers.length === 0 && usuarios.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Todos os usuários disponíveis:
                </p>
              )}
              {marketingUsers.length === 0 && usuarios.length > 0 && (
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {usuarios.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={form.assigned_user_ids.includes(u.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setForm((f) => ({ ...f, assigned_user_ids: [...f.assigned_user_ids, u.id] }));
                          } else {
                            setForm((f) => ({ ...f, assigned_user_ids: f.assigned_user_ids.filter((id) => id !== u.id) }));
                          }
                        }}
                      />
                      <Label className="text-sm font-normal cursor-pointer">{u.nome}</Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Configuração de recorrência */}
            <div className="grid gap-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.is_recurring}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_recurring: checked }))}
                />
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Tarefa recorrente
                </Label>
              </div>
              
              {form.is_recurring && (
                <div className="grid gap-3 pl-6 border-l-2 border-primary/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-sm">Tipo de recorrência</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={form.recurrence_type}
                        onChange={(e) => setForm((f) => ({ ...f, recurrence_type: e.target.value }))}
                      >
                        <option value="diaria">Diária</option>
                        <option value="semanal">Semanal</option>
                        <option value="mensal">Mensal</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm">Intervalo</Label>
                      <Input
                        type="number"
                        min="1"
                        value={form.recurrence_interval}
                        onChange={(e) => setForm((f) => ({ ...f, recurrence_interval: Number(e.target.value) }))}
                        placeholder="A cada X"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm">Gerar até (data final)</Label>
                    <Input
                      type="date"
                      value={form.recurrence_end_date}
                      onChange={(e) => setForm((f) => ({ ...f, recurrence_end_date: e.target.value }))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A tarefa será gerada automaticamente {form.recurrence_type === "diaria" ? "diariamente" : form.recurrence_type === "semanal" ? "semanalmente" : "mensalmente"} 
                    {" "}a cada {form.recurrence_interval} {form.recurrence_type === "diaria" ? "dia(s)" : form.recurrence_type === "semanal" ? "semana(s)" : "mês(es)"} até a data final.
                  </p>
                </div>
              )}
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

      {/* Modal de Cobrança */}
      {cobrarTaskId && (
        <CobrarModal
          open={!!cobrarTaskId}
          onOpenChange={(open) => {
            if (!open) setCobrarTaskId(null);
          }}
          taskId={cobrarTaskId}
          taskName={list.find((t) => t.id === cobrarTaskId)?.titulo || "Tarefa"}
        />
      )}

      {/* Drawer de Tarefa (Notion) */}
      {taskDatabase && (
        <TaskDrawer
          open={selectedTaskId !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedTaskId(null);
          }}
          taskId={selectedTaskId}
          properties={taskProperties}
          usuarios={usuarios}
          projetos={projetos}
          onSave={() => {
            load();
            setSelectedTaskId(null);
          }}
        />
      )}
    </motion.div>
  );
}
