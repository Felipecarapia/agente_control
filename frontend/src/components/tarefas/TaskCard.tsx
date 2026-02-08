"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User, Calendar, Flag, Repeat, FolderKanban } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type Tarefa = {
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

interface TaskCardProps {
  tarefa: Tarefa;
  projetoNome: string;
  responsavelNome: string | null;
  isCompleted: boolean;
  onToggleComplete: (id: number) => void;
  onClick: (id: number) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  alta: "bg-red-500/10 text-red-600 border-red-500/20",
  media: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  baixa: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export function TaskCard({
  tarefa,
  projetoNome,
  responsavelNome,
  isCompleted,
  onToggleComplete,
  onClick,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tarefa.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColor = tarefa.prioridade
    ? PRIORITY_COLORS[tarefa.prioridade.toLowerCase()] || ""
    : "";

  const dueDate = tarefa.data_vencimento
    ? new Date(tarefa.data_vencimento)
    : null;

  const isOverdue = dueDate && dueDate < new Date() && !isCompleted;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer",
        isCompleted && "opacity-75",
        isOverdue && !isCompleted && "border-red-500/50 bg-red-50/50 dark:bg-red-950/10",
        isDragging && "ring-2 ring-primary"
      )}
      onClick={() => onClick(tarefa.id)}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggleComplete(tarefa.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 flex-shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <h3
            className={cn(
              "font-semibold text-sm leading-tight",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {tarefa.titulo}
          </h3>

          {/* Contexto - Projeto */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FolderKanban className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{projetoNome}</span>
          </div>

          {/* Responsável */}
          {responsavelNome && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{responsavelNome}</span>
            </div>
          )}

          {/* Data de vencimento */}
          {dueDate && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs",
                isOverdue && !isCompleted
                  ? "text-red-600 font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>
                {format(dueDate, "dd MMM yyyy", { locale: ptBR })}
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {tarefa.prioridade && (
              <Badge
                variant="outline"
                className={cn("text-xs", priorityColor)}
              >
                <Flag className="h-2.5 w-2.5 mr-1" />
                {tarefa.prioridade}
              </Badge>
            )}
            {tarefa.is_recurring && (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                <Repeat className="h-2.5 w-2.5 mr-1" />
                Recorrente
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

