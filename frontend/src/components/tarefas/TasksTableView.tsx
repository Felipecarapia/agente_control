"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Settings, Filter, ArrowUpDown, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  property_values: TaskPropertyValue[];
};

interface TasksTableViewProps {
  databaseId: string;
  viewId?: string;
  properties: TaskProperty[];
  onTaskClick: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onCreateTask: () => void;
}

export function TasksTableView({
  databaseId,
  viewId,
  properties,
  onTaskClick,
  onToggleComplete,
  onCreateTask,
}: TasksTableViewProps) {
  const [tasks, setTasks] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleProperties, setVisibleProperties] = useState<string[]>(() => {
    // Propriedades padrão visíveis
    return ["titulo", "status", "prioridade", "data_vencimento"];
  });

  useEffect(() => {
    loadTasks();
  }, [databaseId]);

  async function loadTasks() {
    setLoading(true);
    try {
      // apiClient já extrai data do formato {ok: true, data: [...]}
      const data = await api<Tarefa[]>(`/api/v1/tarefas?projeto_id=0`);
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      // Silenciar erro - não quebrar UX
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

  function renderCell(task: Tarefa, propertyKey: string) {
    if (propertyKey === "titulo") {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={task.status === "concluida"}
            onCheckedChange={() => onToggleComplete(task.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <span
            className="font-medium cursor-pointer hover:underline"
            onClick={() => onTaskClick(task.id)}
          >
            {task.titulo}
          </span>
        </div>
      );
    }

    if (propertyKey === "status") {
      return (
        <Badge variant="outline" className="text-xs">
          {task.status}
        </Badge>
      );
    }

    if (propertyKey === "prioridade") {
      const value = task.prioridade || getPropertyValue(task, "prioridade");
      if (!value) return <span className="text-muted-foreground">-</span>;
      return (
        <Badge
          variant="outline"
          className={
            value.toLowerCase() === "alta" || value.toLowerCase() === "urgente"
              ? "border-red-500 text-red-600"
              : value.toLowerCase() === "média"
              ? "border-yellow-500 text-yellow-600"
              : "border-blue-500 text-blue-600"
          }
        >
          {value}
        </Badge>
      );
    }

    if (propertyKey === "data_vencimento") {
      if (!task.data_vencimento) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-sm">
          {format(new Date(task.data_vencimento), "dd MMM yyyy", { locale: ptBR })}
        </span>
      );
    }

    // Propriedade customizável
    const value = getPropertyValue(task, propertyKey);
    if (!value) return <span className="text-muted-foreground">-</span>;

    const property = properties.find((p) => p.key === propertyKey);
    if (!property) return <span>-</span>;

    if (property.type === "SELECT" || property.type === "MULTI_SELECT") {
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {v}
              </Badge>
            ))}
          </div>
        );
      }
      return <Badge variant="outline" className="text-xs">{value}</Badge>;
    }

    if (property.type === "CHECKBOX") {
      return value ? "✓" : "";
    }

    if (property.type === "DATE") {
      return (
        <span className="text-sm">
          {format(new Date(value), "dd MMM yyyy", { locale: ptBR })}
        </span>
      );
    }

    return <span className="text-sm">{String(value)}</span>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Ordenar
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Propriedades
          </Button>
        </div>
        <Button onClick={onCreateTask} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova tarefa
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleProperties.map((key) => {
                  const property = properties.find((p) => p.key === key);
                  const displayName =
                    key === "titulo"
                      ? "Título"
                      : key === "status"
                      ? "Status"
                      : key === "prioridade"
                      ? "Prioridade"
                      : key === "data_vencimento"
                      ? "Vencimento"
                      : property?.name || key;

                  return (
                    <TableHead key={key} className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {displayName}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleProperties.length}
                    className="text-center py-12 text-muted-foreground"
                  >
                    Nenhuma tarefa encontrada
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onTaskClick(task.id)}
                  >
                    {visibleProperties.map((key) => (
                      <TableCell key={key}>
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
    </div>
  );
}




