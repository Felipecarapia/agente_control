"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  ArrowUpDown,
  Settings,
  Plus,
  GripVertical,
  Calendar,
  User,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Archive,
  Trash2,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TaskProperty = {
  id: string;
  key: string;
  name: string;
  type: string;
  config_json?: any;
};

type TaskPropertyValue = {
  id: string;
  property_id: string;
  value_json?: any;
};

type Tarefa = {
  id: string;
  titulo: string;
  status: string;
  prioridade: string | null;
  data_vencimento: string | null;
  responsavel_id: string | null;
  projeto_id: string | null;
  property_values: TaskPropertyValue[];
};

type Usuario = { id: string; nome: string; avatar_url?: string };
type Projeto = { id: string; nome: string };

interface TasksTableViewProps {
  databaseId?: string;
  viewId?: string;
  properties: TaskProperty[];
  usuarios: Usuario[];
  projetos: Projeto[];
  onTaskClick: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onCreateTask?: () => void;
  filterStatus?: string[];
}

export function TasksTableView({
  databaseId,
  viewId,
  properties,
  usuarios,
  projetos,
  onTaskClick,
  onToggleComplete,
  onCreateTask,
  filterStatus,
}: TasksTableViewProps) {
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [visibleProperties, setVisibleProperties] = useState<string[]>([
    "titulo",
    "responsavel",
    "status",
    "prioridade",
    "data_vencimento",
    "projeto"
  ]);

  useEffect(() => {
    loadTasks();
  }, [databaseId]);

  type KanbanData = {
    pendente: Tarefa[];
    em_andamento: Tarefa[];
    concluida: Tarefa[];
  };

  async function loadTasks() {
    setLoading(true);
    try {
      // Usando endpoint do Kanban para garantir consistência de dados
      const data = await api<KanbanData>("/api/v1/tarefas/kanban");

      const flatTasks = [
        ...(data.pendente || []),
        ...(data.em_andamento || []),
        ...(data.concluida || [])
      ];

      setTasks(flatTasks);
    } catch (e) {
      console.error("Erro ao carregar tarefas (rota kanban):", e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  function getPropertyValue(task: Tarefa, propertyKey: string): any {
    const property = properties.find((p) => p.key === propertyKey);
    if (!property) return null;

    const value = task.property_values?.find(
      (pv) => pv.property_id === property.id
    );
    if (!value || !value.value_json) return null;

    return value.value_json.value || value.value_json;
  }

  function getAvatarColor(name: string): string {
    if (!name) return "bg-gray-500";
    const colors = ["bg-red-500", "bg-green-500", "bg-blue-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500"];
    return colors[name.charCodeAt(0) % colors.length];
  }

  function renderCell(task: Tarefa, propertyKey: string) {
    if (propertyKey === "titulo") {
      const isSelected = selectedTasks.has(task.id);
      return (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              const newSelected = new Set(selectedTasks);
              if (checked) {
                newSelected.add(task.id);
              } else {
                newSelected.delete(task.id);
              }
              setSelectedTasks(newSelected);
            }}
            onClick={(e) => e.stopPropagation()}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <span
            className={`font-medium cursor-pointer hover:text-primary transition-colors ${task.status === "concluida" ? "line-through text-muted-foreground" : ""
              }`}
            onClick={() => onTaskClick(task.id)}
          >
            {task.titulo}
          </span>
        </div>
      );
    }

    if (propertyKey === "responsavel") {
      const responsavel = usuarios.find(u => String(u.id) === String(task.responsavel_id));
      if (!responsavel) {
        return (
          <div className="flex items-center gap-2 text-muted-foreground opacity-50">
            <User className="h-4 w-4" />
            <span className="text-xs">Sem resp.</span>
          </div>
        )
      }
      return (
        <div className="flex items-center gap-2 group relative">
          <Avatar className="h-6 w-6">
            <AvatarImage src={responsavel.avatar_url} />
            <AvatarFallback className={`text-[10px] text-white ${getAvatarColor(responsavel.nome)}`}>
              {responsavel.nome.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">{responsavel.nome}</span>
        </div>
      )
    }

    if (propertyKey === "projeto") {
      const proj = projetos.find(p => String(p.id) === String(task.projeto_id));

      if (!proj) return <span className="text-muted-foreground text-xs">-</span>;

      return (
        <Badge variant="secondary" className="text-[10px] font-normal gap-1 hover:bg-secondary/80">
          <Briefcase className="h-3 w-3 opacity-50" />
          {proj.nome}
        </Badge>
      )
    }

    if (propertyKey === "status") {
      let colorClass = "bg-gray-100 text-gray-700 border-gray-200";
      if (task.status === "concluida") colorClass = "bg-green-100 text-green-700 border-green-200";
      if (task.status === "em_andamento") colorClass = "bg-blue-100 text-blue-700 border-blue-200";
      if (task.status === "cancelada") colorClass = "bg-red-100 text-red-700 border-red-200";

      const label = {
        pendente: "Pendente",
        em_andamento: "Em Andamento",
        concluida: "Concluída",
        cancelada: "Cancelada"
      }[task.status] || task.status;

      return (
        <Badge variant="outline" className={`text-xs border ${colorClass}`}>
          {label}
        </Badge>
      );
    }

    if (propertyKey === "prioridade") {
      const value = task.prioridade || getPropertyValue(task, "prioridade");
      if (!value || value === "none") return <span className="text-muted-foreground text-xs">-</span>;

      let badgeColor = "border-gray-200 text-gray-600";
      const v = value.toLowerCase();
      if (v === "alta" || v === "urgente") badgeColor = "border-red-200 bg-red-50 text-red-700";
      if (v === "media") badgeColor = "border-yellow-200 bg-yellow-50 text-yellow-700";
      if (v === "baixa") badgeColor = "border-blue-200 bg-blue-50 text-blue-700";

      return (
        <Badge variant="outline" className={`text-xs gap-1 ${badgeColor}`}>
          <AlertCircle className="h-3 w-3" />
          {value}
        </Badge>
      );
    }

    if (propertyKey === "data_vencimento") {
      if (!task.data_vencimento) return <span className="text-muted-foreground text-xs text-center block">-</span>;
      const date = new Date(task.data_vencimento);
      const isLate = date < new Date() && task.status !== "concluida";

      return (
        <div className={`flex items-center gap-1.5 text-xs ${isLate ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(date, "dd MMM", { locale: ptBR })}</span>
        </div>
      );
    }

    // Propriedade customizável
    const value = getPropertyValue(task, propertyKey);
    if (!value) return <span className="text-muted-foreground text-xs">-</span>;

    const property = properties.find((p) => p.key === propertyKey);
    if (!property) return <span className="text-xs">{String(value)}</span>;

    if (property.type === "SELECT" || property.type === "MULTI_SELECT") {
      // ... mesmo código anterior
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {v}
              </Badge>
            ))}
          </div>
        );
      }
      return <Badge variant="outline" className="text-[10px]">{value}</Badge>;
    }

    return <span className="text-xs">{String(value)}</span>;
  }

  // Bulk Actions
  async function handleBulkComplete() {
    try {
      await Promise.all(
        Array.from(selectedTasks).map(id =>
          api(`/api/v1/tarefas/${id}/toggle-status`, { method: "POST" })
        )
      );
      setSelectedTasks(new Set());
      loadTasks();
    } catch (error) {
      console.error("Erro ao concluir tarefas:", error);
    }
  }

  async function handleBulkArchive() {
    try {
      await Promise.all(
        Array.from(selectedTasks).map(id =>
          api(`/api/v1/tarefas/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "arquivada" })
          })
        )
      );
      setSelectedTasks(new Set());
      loadTasks();
    } catch (error) {
      console.error("Erro ao arquivar tarefas:", error);
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Tem certeza que deseja excluir ${selectedTasks.size} tarefa(s)?`)) {
      return;
    }
    try {
      await Promise.all(
        Array.from(selectedTasks).map(id =>
          api(`/api/v1/tarefas/${id}`, { method: "DELETE" })
        )
      );
      setSelectedTasks(new Set());
      loadTasks();
    } catch (error) {
      console.error("Erro ao excluir tarefas:", error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/20 animate-pulse rounded-md" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/10 animate-pulse rounded-md border" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative">
      {/* Floating Action Bar */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <div className="bg-primary text-primary-foreground rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
            <span className="font-medium text-sm">
              {selectedTasks.size} {selectedTasks.size === 1 ? 'tarefa selecionada' : 'tarefas selecionadas'}
            </span>
            <div className="h-4 w-px bg-primary-foreground/30" />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleBulkComplete}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Concluir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleBulkArchive}
              >
                <Archive className="h-4 w-4 mr-1.5" />
                Arquivar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-red-400"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Excluir
              </Button>
              <div className="h-4 w-px bg-primary-foreground/30" />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setSelectedTasks(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Visual Toolbar - Simplificada pois o Header principal já tem filtros */}
      {/* Se quiser adicionar mais filtros específicos da tabela aqui, pode. */}

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              {visibleProperties.map((key) => {
                const property = properties.find((p) => p.key === key);
                const displayName =
                  key === "titulo" ? "Tarefa"
                    : key === "status" ? "Status"
                      : key === "prioridade" ? "Prioridade"
                        : key === "data_vencimento" ? "Prazo"
                          : key === "responsavel" ? "Responsável"
                            : key === "projeto" ? "Projeto"
                              : property?.name || key;

                return (
                  <TableHead key={key} className="h-10 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
                      {displayName}
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.filter(t => !filterStatus || filterStatus.length === 0 || filterStatus.includes(t.status)).length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleProperties.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <User className="h-8 w-8 opacity-20" />
                    <p>Nenhuma tarefa encontrada</p>
                    <Button variant="link" onClick={onCreateTask} className="text-primary">Criar nova tarefa</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tasks
                .filter(t => !filterStatus || filterStatus.length === 0 || filterStatus.includes(t.status))
                .map((task) => (
                  <TableRow
                    key={task.id}
                    className="group cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => onTaskClick(task.id)}
                  >
                    {visibleProperties.map((key) => (
                      <TableCell key={key} className="py-2.5">
                        {renderCell(task, key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
