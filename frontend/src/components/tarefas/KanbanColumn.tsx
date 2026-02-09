"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { TaskCard, Tarefa } from "./TaskCard";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Tarefa[];
  projetoMap: Record<string, string>;
  usuarioMap: Record<string, string>;
  onToggleComplete: (id: string) => void;
  onTaskClick: (id: string) => void;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  projetoMap,
  usuarioMap,
  onToggleComplete,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[320px]">
      <div
        className={cn(
          "sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-2 mb-2"
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto space-y-2 px-1",
          isOver && "bg-primary/5 rounded-lg"
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma tarefa
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                tarefa={task}
                projetoNome={projetoMap[task.projeto_id] || "-"}
                responsavelNome={
                  task.responsavel_id
                    ? usuarioMap[task.responsavel_id] || null
                    : null
                }
                isCompleted={task.status === "concluida"}
                onToggleComplete={onToggleComplete}
                onClick={onTaskClick}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}




