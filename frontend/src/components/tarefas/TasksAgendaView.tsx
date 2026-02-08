"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItemCompact, Tarefa } from "./TaskItemCompact";
import { AgendaSkeleton } from "@/components/ui/agenda-skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TasksAgendaViewProps {
  projetos: Array<{ id: number; nome: string }>;
  usuarios: Array<{ id: number; nome: string }>;
  onToggleComplete: (id: number) => void;
  onTaskClick: (id: number) => void;
}

export function TasksAgendaView({
  projetos,
  usuarios,
  onToggleComplete,
  onTaskClick,
}: TasksAgendaViewProps) {
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const projetoMap = Object.fromEntries(projetos.map((p) => [p.id, p.nome]));
  const usuarioMap = Object.fromEntries(usuarios.map((u) => [u.id, u.nome]));

  // Calcular intervalo da semana (7 dias a partir do início da semana)
  const weekEnd = addDays(currentWeekStart, 6);

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      try {
        const fromDate = format(currentWeekStart, "yyyy-MM-dd");
        const toDate = format(weekEnd, "yyyy-MM-dd");
        const data = await api<Tarefa[]>(
          `/api/v1/tarefas/range?from=${fromDate}&to=${toDate}`
        );
        setTasks(data);
      } catch (e) {
        console.error("Erro ao carregar tarefas:", e);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [currentWeekStart, weekEnd]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  function getTasksForDay(day: Date): Tarefa[] {
    return tasks.filter((t) => {
      if (!t.data_vencimento) return false;
      const taskDate = new Date(t.data_vencimento);
      return isSameDay(taskDate, day);
    });
  }

  function handlePreviousWeek() {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  }

  function handleNextWeek() {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  }

  function handleToday() {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }

  if (loading) {
    return <AgendaSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Controles de navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-4">
            {format(currentWeekStart, "d MMM", { locale: ptBR })} -{" "}
            {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isDayToday = isToday(day);

          return (
            <Card key={day.toISOString()} className={isDayToday ? "border-primary" : ""}>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="flex items-center justify-between">
                    <span>{format(day, "EEE", { locale: ptBR })}</span>
                    <span
                      className={cn(
                        "text-xs font-normal",
                        isDayToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhuma tarefa
                  </p>
                ) : (
                  dayTasks.map((task) => (
                    <TaskItemCompact
                      key={task.id}
                      tarefa={task}
                      projetoNome={projetoMap[task.projeto_id]}
                      responsavelNome={task.responsavel_id ? usuarioMap[task.responsavel_id] : undefined}
                      onToggleComplete={onToggleComplete}
                      onClick={onTaskClick}
                      className="text-xs"
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

