"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItemCompact, Tarefa } from "./TaskItemCompact";
import { AgendaSkeleton } from "@/components/ui/agenda-skeleton";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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
    let cancelled = false;
    async function loadTasks() {
      setLoading(true);
      try {
        const fromDate = format(currentWeekStart, "yyyy-MM-dd");
        const toDate = format(weekEnd, "yyyy-MM-dd");
        const data = await api<Tarefa[]>(
          `/api/v1/tarefas/range?from=${fromDate}&to=${toDate}`
        ).catch(() => []); // Retornar array vazio em caso de erro
        
        if (!cancelled) {
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        // Silenciar erros - usar array vazio
        if (!cancelled) {
          setTasks([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadTasks();
    return () => {
      cancelled = true;
    };
  }, [currentWeekStart]);

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

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "concluida").length;

  return (
    <div className="space-y-6">
      {/* Controles de navegação melhorados */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handlePreviousWeek} className="h-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday} className="h-9 px-4">
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek} className="h-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">
              {format(currentWeekStart, "d MMM", { locale: ptBR })} -{" "}
              {format(weekEnd, "d MMM yyyy", { locale: ptBR })}
            </span>
            {totalTasks > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {totalTasks} {totalTasks === 1 ? "tarefa" : "tarefas"}
                {completedTasks > 0 && ` • ${completedTasks} concluída${completedTasks > 1 ? "s" : ""}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid de dias melhorada */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayTasks = getTasksForDay(day);
          const isDayToday = isToday(day);
          const completedCount = dayTasks.filter(t => t.status === "concluida").length;
          const pendingCount = dayTasks.length - completedCount;

          return (
            <Card 
              key={day.toISOString()} 
              className={cn(
                "flex flex-col h-full transition-all hover:shadow-md",
                isDayToday && "ring-2 ring-primary shadow-lg border-primary"
              )}
            >
              <CardHeader className={cn(
                "p-4 pb-3 border-b",
                isDayToday && "bg-primary/5"
              )}>
                <CardTitle className="text-sm font-semibold">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "uppercase tracking-wide",
                      isDayToday && "text-primary font-bold"
                    )}>
                      {format(day, "EEE", { locale: ptBR })}
                    </span>
                    <div className="flex items-center gap-2">
                      {dayTasks.length > 0 && (
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {dayTasks.length}
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                          isDayToday 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>
                  </div>
                </CardTitle>
                {dayTasks.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    {pendingCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                      </span>
                    )}
                    {completedCount > 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {completedCount} concluída{completedCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-3 pt-3 flex-1 overflow-y-auto min-h-[200px] max-h-[600px]">
                {dayTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Nenhuma tarefa
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayTasks.map((task) => (
                      <TaskItemCompact
                        key={task.id}
                        tarefa={task}
                        projetoNome={projetoMap[task.projeto_id]}
                        responsavelNome={task.responsavel_id ? usuarioMap[task.responsavel_id] : undefined}
                        onToggleComplete={onToggleComplete}
                        onClick={onTaskClick}
                        className="text-xs"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

