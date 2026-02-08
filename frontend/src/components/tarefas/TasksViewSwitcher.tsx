"use client";

import { List, Calendar as CalendarIcon, CalendarDays, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TasksView = "list" | "agenda" | "calendar" | "kanban" | "table";

interface TasksViewSwitcherProps {
  view: TasksView;
  onViewChange: (view: TasksView) => void;
}

export function TasksViewSwitcher({ view, onViewChange }: TasksViewSwitcherProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className={cn(
          "flex items-center gap-2",
          view === "list" && "bg-background shadow-sm"
        )}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">Lista</span>
      </Button>
      <Button
        variant={view === "agenda" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("agenda")}
        className={cn(
          "flex items-center gap-2",
          view === "agenda" && "bg-background shadow-sm"
        )}
      >
        <CalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">Agenda</span>
      </Button>
      <Button
        variant={view === "calendar" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("calendar")}
        className={cn(
          "flex items-center gap-2",
          view === "calendar" && "bg-background shadow-sm"
        )}
      >
        <CalendarIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Calendário</span>
      </Button>
      <Button
        variant={view === "kanban" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("kanban")}
        className={cn(
          "flex items-center gap-2",
          view === "kanban" && "bg-background shadow-sm"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Kanban</span>
      </Button>
      <Button
        variant={view === "table" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("table")}
        className={cn(
          "flex items-center gap-2",
          view === "table" && "bg-background shadow-sm"
        )}
      >
        <Table2 className="h-4 w-4" />
        <span className="hidden sm:inline">Tabela</span>
      </Button>
    </div>
  );
}

