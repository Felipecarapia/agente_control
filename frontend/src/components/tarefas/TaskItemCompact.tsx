"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, FolderKanban, User, Repeat, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  projeto_id: string;
  status: string;
  prioridade: string | null;
  responsavel_id: string | null;
  data_vencimento: string | null;
  is_recurring?: boolean;
  recurrence_type?: string | null;
  assigned_user_ids?: string[];
  assigned_users?: Array<{ id: string; usuario_id: string; usuario_nome: string | null }>;
};

interface TaskItemCompactProps {
  tarefa: Tarefa;
  projetoNome?: string;
  responsavelNome?: string;
  onToggleComplete?: (id: string) => void;
  onClick?: (id: string) => void;
  showCheckbox?: boolean;
  className?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  alta: "bg-red-500/10 text-red-600 border-red-500/20",
  media: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  baixa: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

export function TaskItemCompact({
  tarefa,
  projetoNome,
  responsavelNome,
  onToggleComplete,
  onClick,
  showCheckbox = true,
  className,
}: TaskItemCompactProps) {
  const isCompleted = tarefa.status === "concluida";
  const hasTime = tarefa.data_vencimento ? tarefa.data_vencimento.includes("T") : false;
  const dateOnly = tarefa.data_vencimento ? tarefa.data_vencimento.split("T")[0] : null;
  const timeOnly = tarefa.data_vencimento && hasTime ? tarefa.data_vencimento.split("T")[1]?.substring(0, 5) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer",
        isCompleted && "opacity-60",
        className
      )}
      onClick={() => onClick?.(tarefa.id)}
    >
      {showCheckbox && (
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => onToggleComplete?.(tarefa.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
      )}
      
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            "text-sm font-medium leading-tight",
            isCompleted && "line-through text-muted-foreground"
          )}>
            {tarefa.titulo}
          </h4>
          <div className="flex items-center gap-1 flex-shrink-0">
            {tarefa.is_recurring && (
              <Badge variant="outline" className="text-xs">
                <Repeat className="h-3 w-3 mr-1" />
                Recorrente
              </Badge>
            )}
            {tarefa.prioridade && (
              <Badge
                variant="outline"
                className={cn("text-xs", PRIORITY_COLORS[tarefa.prioridade.toLowerCase()] || "")}
              >
                <Flag className="h-3 w-3 mr-1" />
                {tarefa.prioridade}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {projetoNome && (
            <div className="flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              <span className="truncate">{projetoNome}</span>
            </div>
          )}
          {responsavelNome && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">{responsavelNome}</span>
            </div>
          )}
          {dateOnly && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(dateOnly).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
                {timeOnly && ` às ${timeOnly}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

