"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { api } from "@/lib/api";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard, Tarefa } from "./TaskCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export type TarefaKanban = Tarefa;

interface TasksKanbanViewProps {
  projetos: Array<{ id: string; nome: string }>;
  usuarios: Array<{ id: string; nome: string }>;
  onToggleComplete: (id: string) => void;
  onTaskClick: (id: string) => void;
  onCreateTask?: () => void;
}

type KanbanData = {
  pendente: TarefaKanban[];
  em_andamento: TarefaKanban[];
  concluida: TarefaKanban[];
};

const STATUS_MAP: Record<string, keyof KanbanData> = {
  pendente: "pendente",
  em_andamento: "em_andamento",
  concluida: "concluida",
};

const COLUMN_CONFIG = [
  { id: "pendente", title: "A Fazer", status: "pendente" as const },
  { id: "em_andamento", title: "Fazendo", status: "em_andamento" as const },
  { id: "concluida", title: "Concluídas", status: "concluida" as const },
];

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex-shrink-0 w-80 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ))}
    </div>
  );
}

export function TasksKanbanView({
  projetos,
  usuarios,
  onToggleComplete,
  onTaskClick,
  onCreateTask,
}: TasksKanbanViewProps) {
  const [kanbanData, setKanbanData] = useState<KanbanData>({
    pendente: [],
    em_andamento: [],
    concluida: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TarefaKanban | null>(null);

  const projetoMap = Object.fromEntries(projetos.map((p) => [p.id, p.nome]));
  const usuarioMap = Object.fromEntries(usuarios.map((u) => [u.id, u.nome]));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  async function loadKanban() {
    setLoading(true);
    try {
      const data = await api<KanbanData>("/api/v1/tarefas/kanban").catch(() => ({
        pendente: [],
        em_andamento: [],
        concluida: [],
      }));
      setKanbanData(data || {
        pendente: [],
        em_andamento: [],
        concluida: [],
      });
    } catch (e) {
      // Silenciar erros - usar valores padrão
      setKanbanData({
        pendente: [],
        em_andamento: [],
        concluida: [],
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKanban();
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const taskId = active.id.toString();
    
    // Encontrar a tarefa em qualquer coluna
    const allTasks = [
      ...kanbanData.pendente,
      ...kanbanData.em_andamento,
      ...kanbanData.concluida,
    ];
    const task = allTasks.find((t) => t.id.toString() === taskId);
    setActiveTask(task || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id.toString();
    const targetColumnId = over.id.toString();

    // Encontrar a tarefa atual
    const allTasks = [
      ...kanbanData.pendente,
      ...kanbanData.em_andamento,
      ...kanbanData.concluida,
    ];
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determinar novo status baseado na coluna
    let newStatus: string;
    if (targetColumnId === "pendente") {
      newStatus = "pendente";
    } else if (targetColumnId === "em_andamento") {
      newStatus = "em_andamento";
    } else if (targetColumnId === "concluida") {
      newStatus = "concluida";
    } else {
      return; // Coluna inválida
    }

    // Se o status não mudou, não fazer nada
    if (task.status === newStatus) return;

    // Atualização otimista
    const previousData = { ...kanbanData };
    const newData = { ...kanbanData };

    // Remover da coluna antiga
    const oldColumn = STATUS_MAP[task.status] || "pendente";
    newData[oldColumn] = newData[oldColumn].filter((t) => t.id !== taskId);

    // Adicionar à nova coluna
    const newColumn = STATUS_MAP[newStatus] || "pendente";
    const updatedTask = { ...task, status: newStatus };
    newData[newColumn] = [...newData[newColumn], updatedTask];

    setKanbanData(newData);

    try {
      // Atualizar no backend
      await api(`/api/v1/tarefas/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      
      // Recarregar para garantir sincronização
      await loadKanban();
    } catch (e: any) {
      // Reverter em caso de erro
      setKanbanData(previousData);
      // Silenciar erro - não quebrar UX
    }
  }

  async function handleToggleComplete(id: string) {
    // Atualização otimista
    const previousData = { ...kanbanData };
    const task = [
      ...kanbanData.pendente,
      ...kanbanData.em_andamento,
      ...kanbanData.concluida,
    ].find((t) => t.id === id);

    if (!task) return;

    const newStatus = task.status === "concluida" ? "pendente" : "concluida";
    const newData = { ...kanbanData };

    // Remover da coluna atual
    const oldColumn = STATUS_MAP[task.status] || "pendente";
    newData[oldColumn] = newData[oldColumn].filter((t) => t.id !== id);

    // Adicionar à nova coluna
    const newColumn = STATUS_MAP[newStatus] || "pendente";
    const updatedTask = { ...task, status: newStatus };
    newData[newColumn] = [...newData[newColumn], updatedTask];

    setKanbanData(newData);

    try {
      await api(`/api/v1/tarefas/${id}/toggle-status`, { method: "POST" });
      // Recarregar para garantir sincronização e pegar nova tarefa recorrente se houver
      await loadKanban();
      onToggleComplete(id);
    } catch (e: any) {
      // Reverter em caso de erro
      setKanbanData(previousData);
      // Silenciar erro - não quebrar UX
    }
  }

  if (loading) {
    return <KanbanSkeleton />;
  }

  const totalTasks =
    kanbanData.pendente.length +
    kanbanData.em_andamento.length +
    kanbanData.concluida.length;

  return (
    <div className="space-y-4">
      {totalTasks === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">Nenhuma tarefa encontrada</p>
          {onCreateTask && (
            <Button onClick={onCreateTask} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira tarefa
            </Button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMN_CONFIG.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={kanbanData[column.status]}
                projetoMap={projetoMap}
                usuarioMap={usuarioMap}
                onToggleComplete={handleToggleComplete}
                onTaskClick={onTaskClick}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="w-80">
                <TaskCard
                  tarefa={activeTask}
                  projetoNome={projetoMap[activeTask.projeto_id] || "-"}
                  responsavelNome={
                    activeTask.responsavel_id
                      ? usuarioMap[activeTask.responsavel_id] || null
                      : null
                  }
                  isCompleted={activeTask.status === "concluida"}
                  onToggleComplete={handleToggleComplete}
                  onClick={onTaskClick}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}




