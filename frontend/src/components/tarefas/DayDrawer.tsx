"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskItemCompact, Tarefa } from "./TaskItemCompact";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DayDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  tasks: Tarefa[];
  projetoMap: Record<number, string>;
  usuarioMap: Record<number, string>;
  onToggleComplete: (id: number) => void;
  onTaskClick: (id: number) => void;
  onCreateTask?: (date: Date) => void;
}

export function DayDrawer({
  open,
  onOpenChange,
  date,
  tasks,
  projetoMap,
  usuarioMap,
  onToggleComplete,
  onTaskClick,
  onCreateTask,
}: DayDrawerProps) {
  const formattedDate = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const formattedDateShort = format(date, "dd/MM/yyyy");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}
          </DialogTitle>
          <DialogDescription>
            {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"} para este dia
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {onCreateTask && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onCreateTask(date);
                onOpenChange(false);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar tarefa para {formattedDateShort}
            </Button>
          )}

          {tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhuma tarefa para este dia</p>
              {onCreateTask && (
                <Button
                  variant="link"
                  className="mt-4"
                  onClick={() => {
                    onCreateTask(date);
                    onOpenChange(false);
                  }}
                >
                  Criar primeira tarefa
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskItemCompact
                  key={task.id}
                  tarefa={task}
                  projetoNome={projetoMap[task.projeto_id]}
                  responsavelNome={task.responsavel_id ? usuarioMap[task.responsavel_id] : undefined}
                  onToggleComplete={onToggleComplete}
                  onClick={(id) => {
                    onTaskClick(id);
                    onOpenChange(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

