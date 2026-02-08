"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarSkeleton } from "@/components/ui/calendar-skeleton";
import { DayDrawer } from "./DayDrawer";
import { TaskItemCompact, Tarefa } from "./TaskItemCompact";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TasksCalendarViewProps {
  projetos: Array<{ id: number; nome: string }>;
  usuarios: Array<{ id: number; nome: string }>;
  onToggleComplete: (id: number) => void;
  onTaskClick: (id: number) => void;
  onCreateTask?: (date: Date) => void;
}

export function TasksCalendarView({
  projetos,
  usuarios,
  onToggleComplete,
  onTaskClick,
  onCreateTask,
}: TasksCalendarViewProps) {
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const projetoMap = Object.fromEntries(projetos.map((p) => [p.id, p.nome]));
  const usuarioMap = Object.fromEntries(usuarios.map((u) => [u.id, u.nome]));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  useEffect(() => {
    async function loadTasks() {
      setLoading(true);
      try {
        const fromDate = format(calendarStart, "yyyy-MM-dd");
        const toDate = format(calendarEnd, "yyyy-MM-dd");
        const data = await api<Tarefa[]>(
          `/api/v1/tarefas/range?from=${fromDate}&to=${toDate}`
        ).catch(() => []); // Retornar array vazio em caso de erro
        setTasks(Array.isArray(data) ? data : []);
      } catch (e) {
        // Silenciar erros - usar array vazio
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [currentMonth, calendarStart, calendarEnd]);

  function getTasksForDay(day: Date): Tarefa[] {
    return tasks.filter((t) => {
      if (!t.data_vencimento) return false;
      const taskDate = new Date(t.data_vencimento);
      return isSameDay(taskDate, day);
    });
  }

  function getTaskCountForDay(day: Date): number {
    return getTasksForDay(day).length;
  }

  function getPriorityCount(day: Date): { high: number; medium: number; low: number } {
    const dayTasks = getTasksForDay(day);
    return {
      high: dayTasks.filter((t) => t.prioridade?.toLowerCase() === "alta").length,
      medium: dayTasks.filter((t) => t.prioridade?.toLowerCase() === "media").length,
      low: dayTasks.filter((t) => t.prioridade?.toLowerCase() === "baixa").length,
    };
  }

  function handleDayClick(day: Date) {
    setSelectedDate(day);
    setDrawerOpen(true);
  }

  function handlePreviousMonth() {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }

  function handleNextMonth() {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }

  function handleToday() {
    setCurrentMonth(new Date());
  }

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  if (loading) {
    return <CalendarSkeleton />;
  }

  return (
    <>
      <div className="space-y-4">
        {/* Controles de navegação */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendário */}
        <Card>
          <CardContent className="p-4">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const taskCount = getTaskCountForDay(day);
                const priorities = getPriorityCount(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isDayToday = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "relative min-h-[80px] p-2 rounded-lg border text-left transition-colors",
                      isCurrentMonth ? "bg-card hover:bg-accent" : "bg-muted/30 text-muted-foreground",
                      isDayToday && "border-primary ring-2 ring-primary/20",
                      "flex flex-col gap-1"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isDayToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    {taskCount > 0 && (
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {priorities.high > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          )}
                          {priorities.medium > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          )}
                          {priorities.low > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drawer do dia */}
      {selectedDate && (
        <DayDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          date={selectedDate}
          tasks={getTasksForDay(selectedDate)}
          projetoMap={projetoMap}
          usuarioMap={usuarioMap}
          onToggleComplete={onToggleComplete}
          onTaskClick={onTaskClick}
          onCreateTask={onCreateTask}
        />
      )}
    </>
  );
}

