"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Download,
  Upload,
  Filter,
  ListFilter,
  ArrowUpDown,
  Settings,
  CheckCircle2,
  Clock,
  AlertCircle,
  Inbox,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  Table2,
  CalendarDays
} from "lucide-react";

// Imports dos componentes ORIGINAIS de Tarefas
import { TasksViewSwitcher, TasksView } from "@/components/tarefas/TasksViewSwitcher";
import { TasksKanbanView } from "@/components/tarefas/TasksKanbanView";
import { TasksTableView } from "@/components/tarefas/TasksTableView";
import { TasksCalendarView } from "@/components/tarefas/TasksCalendarView";
import { TasksAgendaView } from "@/components/tarefas/TasksAgendaView";
import { TaskDrawer } from "@/components/tarefas/TaskDrawer";
import ActionsBankDashboard from "@/components/analytics/ActionsBankDashboard";

// Tipos para dados auxiliares
type Projeto = { id: string; nome: string };
type Usuario = { id: string; nome: string };
type TaskProperty = {
  id: string;
  key: string;
  name: string;
  type: string;
  config_json?: any;
};

export default function TarefasPage() {
  // Estado Visual e de Dados
  const [view, setView] = useState<TasksView>("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  // Filtro: array de status ativos. Padrão = pendente + em_andamento
  const [filterStatus, setFilterStatus] = useState<string[]>(['pendente', 'em_andamento']);

  // Dados auxiliares para passar para as Views e Drawer
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [properties, setProperties] = useState<TaskProperty[]>([]);
  const [loadingAux, setLoadingAux] = useState(true);

  // Carregar dados auxiliares
  useEffect(() => {
    async function loadAux() {
      try {
        const [projArgs, userArgs, propArgs] = await Promise.all([
          api<Projeto[]>("/api/v1/projetos").catch(() => []),
          api<Usuario[]>("/api/v1/usuarios").catch(() => []), // Endpoint corrigido
          api<TaskProperty[]>("/api/v1/task-notion/databases/default/properties").catch(() => [])
        ]);
        setProjetos(Array.isArray(projArgs) ? projArgs : []);
        setUsuarios(Array.isArray(userArgs) ? userArgs : []);
        setProperties(Array.isArray(propArgs) ? propArgs : []);
      } catch (e) {
        console.error("Erro ao carregar dados auxiliares", e);
      } finally {
        setLoadingAux(false);
      }
    }
    loadAux();
  }, []);

  // Handler para abrir criação
  const handleCreate = () => {
    setSelectedTaskId(null);
    setCreateOpen(true);
  };

  // Handler para abrir edição
  const handleEdit = (id: string) => {
    setSelectedTaskId(id);
    setCreateOpen(true); // O Drawer usa open={true} e taskId={id} para editar
  };

  // Refresh handlers (simplesmente recarregam dados das views se necessário, 
  // mas as views gerenciam seu proprio estado na maioria das vezes. 
  // O Drawer chama onSave que podemos usar para forçar refresh se precisarmos)
  const handleSave = () => {
    window.location.reload();
  };

  const handleToggleComplete = async (id: string) => {
    try {
      await api(`/api/v1/tarefas/${id}/toggle-status`, { method: "POST" });
      window.location.reload();
    } catch (e) {
      console.error("Erro ao mudar status", e);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-[1600px] mx-auto p-2 sm:p-4">
      {/* HEADER PREMIUM REFEITO */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Tarefas</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie suas atividades, projetos e prazos em um só lugar.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button onClick={handleCreate} size="sm" className="bg-primary shadow-lg shadow-primary/25 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* BARRA DE CONTROLE E VIEW SWITCHER */}
        <div className="flex flex-col sm:flex-row items-center gap-4 border-b pb-4">
          {/* Switcher integrado ao design */}
          <TasksViewSwitcher view={view} onViewChange={setView} />

          <div className="flex-1" />

          {/* Filtros Rápidos Interativos */}
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border">
            <Button
              variant={filterStatus.length === 0 ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setFilterStatus([])}
            >
              <ListFilter className="h-3.5 w-3.5" />
              Todas
            </Button>
            <div className="w-px h-3 bg-border mx-1" />
            <Button
              variant={filterStatus.includes('pendente') ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                if (filterStatus.includes('pendente')) {
                  setFilterStatus(filterStatus.filter(s => s !== 'pendente'));
                } else {
                  setFilterStatus([...filterStatus, 'pendente']);
                }
              }}
            >
              <Inbox className="h-3.5 w-3.5 text-yellow-500" />
              Pendentes
            </Button>
            <div className="w-px h-3 bg-border mx-1" />
            <Button
              variant={filterStatus.includes('em_andamento') ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                if (filterStatus.includes('em_andamento')) {
                  setFilterStatus(filterStatus.filter(s => s !== 'em_andamento'));
                } else {
                  setFilterStatus([...filterStatus, 'em_andamento']);
                }
              }}
            >
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              Em Andamento
            </Button>
            <div className="w-px h-3 bg-border mx-1" />
            <Button
              variant={filterStatus.includes('concluida') ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                if (filterStatus.includes('concluida')) {
                  setFilterStatus(filterStatus.filter(s => s !== 'concluida'));
                } else {
                  setFilterStatus([...filterStatus, 'concluida']);
                }
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              Concluídas
            </Button>
          </div>
        </div>
      </div>

      {/* CORPO DA PÁGINA COM AS VIEWS ORIGINAIS */}
      <div className="flex-1 overflow-hidden bg-background/50 backdrop-blur-sm rounded-xl border shadow-sm">
        {view === "kanban" && (
          <div className="p-4 h-full overflow-auto">
            <TasksKanbanView
              projetos={projetos}
              usuarios={usuarios}
              onTaskClick={handleEdit}
              onToggleComplete={() => { }} // O Kanban já atualiza localmente
              onCreateTask={handleCreate}
            />
          </div>
        )}

        {view === "calendar" && (
          <div className="p-4 h-full overflow-auto">
            {/* Assumindo props similares para Calendar */}
            <TasksCalendarView
              projetos={projetos}
              usuarios={usuarios}
              onTaskClick={handleEdit}
              onToggleComplete={() => { }}
            />
          </div>
        )}

        {view === "agenda" && (
          <div className="p-4 h-full overflow-auto">
            <TasksAgendaView
              projetos={projetos}
              usuarios={usuarios}
              onTaskClick={handleEdit}
              onToggleComplete={() => { }}
            />
          </div>
        )}

        {(view === "table" || view === "list") && (
          <div className="p-4 h-full overflow-auto">
            <TasksTableView
              properties={properties}
              usuarios={usuarios}
              projetos={projetos}
              filterStatus={filterStatus}
              onTaskClick={handleEdit}
              onCreateTask={handleCreate}
              onToggleComplete={handleToggleComplete}
            />
          </div>
        )}

        {view === "analytics" && (
          <div className="p-4 h-full overflow-auto">
            <ActionsBankDashboard />
          </div>
        )}
      </div>

      {/* DRAWER DE CRIAÇÃO RESTAURADO */}
      <TaskDrawer
        open={createOpen || !!selectedTaskId}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setSelectedTaskId(null);
          }
        }}
        taskId={selectedTaskId}
        usuarios={usuarios}
        projetos={projetos}
        properties={properties}
        onSave={handleSave}
      />
    </div>
  );
}
