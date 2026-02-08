"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanSkeleton } from "@/components/ui/kanban-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Settings,
  Search,
  Filter,
  TrendingUp,
  User,
  DollarSign,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Workflow,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
type Stage = {
  id: number;
  pipeline_id: number;
  name: string;
  key: string | null;
  order_index: number;
  wip_limit: number | null;
  color: string | null;
};

type Deal = {
  id: number;
  title: string;
  client_id: number;
  client_nome: string | null;
  value_cents: number | null;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "won" | "lost";
  position_index: number;
  assignees: Array<{ user_id: number; user_nome: string | null }>;
  tags: Array<{ tag_id: number; tag_name: string | null; tag_color: string | null }>;
  has_pending_activity: boolean;
};

type StageWithDeals = {
  stage: Stage;
  deals: Deal[];
  total_value_cents: number;
  deal_count: number;
};

type ClientListItem = {
  id: number;
  nome: string;
  razao_social: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  has_open_deal: boolean;
};

type KanbanData = {
  pipeline: { id: number; name: string; description: string | null; is_default: boolean } | null;
  stages: StageWithDeals[];
  clients: ClientListItem[];
  clients_total: number;
  clients_page: number;
  clients_page_size: number;
};

function formatCurrency(valueCents: number | null, currency: string = "BRL"): string {
  if (!valueCents) return "-";
  const value = valueCents / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency,
  }).format(value);
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "normal":
      return "bg-blue-500";
    case "low":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

export default function FunilPage() {
  const { toast } = useToast();
  const [kanbanData, setKanbanData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeType, setActiveType] = useState<"DEAL" | "CLIENT" | "STAGE" | null>(null);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [droppedClient, setDroppedClient] = useState<ClientListItem | null>(null);
  const [droppedStageId, setDroppedStageId] = useState<number | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientPage, setClientPage] = useState(1);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadKanban();
  }, [clientPage, clientSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadKanban() {
    setLoading(true);
    setError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    try {
      // Construir URL - não precisa de pipelineId, o backend vai buscar o padrão
      const params = new URLSearchParams({
        clientPage: String(clientPage),
        clientPageSize: "20",
      });
      
      if (clientSearch && clientSearch.trim()) {
        params.append("clientSearch", clientSearch.trim());
      }
      
      const url = `/api/v1/deals/kanban?${params.toString()}`;
      
      // Log apenas em dev
      if (process.env.NODE_ENV === "development") {
        console.log("[loadKanban] Fazendo requisição para:", url);
      }
      
      const response = await api<any>(url);
      
      // Verificar se resposta está no formato padronizado
      const data = response?.ok === true ? response.data : response;
      
      if (data && Array.isArray(data.stages) && Array.isArray(data.clients)) {
        setKanbanData(data);
        setError(null); // Limpar erro se sucesso
        if (process.env.NODE_ENV === "development") {
          console.log("[loadKanban] Dados carregados:", {
            pipeline: data.pipeline?.name || "Padrão",
            stages: data.stages.length,
            clients: data.clients.length,
          });
        }
      } else {
        // Resposta vazia ou inválida - criar estrutura padrão
        setKanbanData({
          pipeline: { id: 0, name: "Funil de Vendas", description: null, is_default: false },
          stages: [],
          clients: [],
          clients_total: 0,
          clients_page: 1,
          clients_page_size: 20
        });
        setError(null);
        if (process.env.NODE_ENV === "development") {
          console.warn("[loadKanban] Resposta vazia ou inválida:", data);
        }
      }
    } catch (e) {
      // Log detalhado apenas em dev
      if (process.env.NODE_ENV === "development") {
        console.error("[loadKanban] Erro:", {
          error: e,
          message: e instanceof Error ? e.message : String(e),
          url: `/api/v1/deals/kanban`,
        });
      }
      
      setKanbanData(null);
      const errorMsg = e instanceof Error 
        ? e.message 
        : "Erro ao carregar Kanban. Verifique se o backend está rodando.";
      
      setError(errorMsg);
      console.error("[loadKanban] Erro final:", errorMsg);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false); // SEMPRE garantir que loading seja false
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id;
    setActiveId(id as number);
    // Determinar tipo: CLIENT, DEAL ou STAGE
    if (typeof id === "string") {
      if (id.startsWith("client-")) {
        setActiveType("CLIENT");
      } else if (id.startsWith("stage-")) {
        setActiveType("STAGE");
      } else {
        setActiveType("DEAL");
      }
    } else {
      setActiveType("DEAL");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveType(null);
      return;
    }
    
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    
    // Se arrastou um CLIENTE para uma STAGE
    if (activeIdStr.startsWith("client-") && overIdStr.startsWith("stage-")) {
      const clientId = parseInt(activeIdStr.replace("client-", ""));
      const stageId = parseInt(overIdStr.replace("stage-", ""));
      const client = kanbanData?.clients.find((c) => c.id === clientId);
      
      if (client) {
        setDroppedClient(client);
        setDroppedStageId(stageId);
        setClientModalOpen(true);
      }
      setActiveType(null);
      return;
    }
    
    // Se arrastou uma STAGE (reordenar colunas)
    if (activeIdStr.startsWith("stage-") && overIdStr.startsWith("stage-")) {
      const fromStageId = parseInt(activeIdStr.replace("stage-", ""));
      const toStageId = parseInt(overIdStr.replace("stage-", ""));
      
      // Reordenar stages (desabilitado - stages são fixos)
      // Stages padrão não podem ser reordenadas sem pipeline
      toast({
        title: "Reordenação desabilitada",
        description: "As colunas padrão não podem ser reordenadas.",
        variant: "default",
      });
      setActiveType(null);
      return;
    }
    
    // Se arrastou um DEAL para outra STAGE
    if (activeIdStr.startsWith("client-") || activeIdStr.startsWith("stage-")) {
      setActiveType(null);
      return; // Já tratado acima
    }
    
    const dealId = active.id as number;
    const targetStageId = parseInt(overIdStr.replace("stage-", ""));
    
    // Encontrar stage atual do deal
    if (!kanbanData) {
      setActiveType(null);
      return;
    }
    
    const currentStage = kanbanData.stages.find((s) =>
      s.deals.some((d) => d.id === dealId)
    );
    
    if (!currentStage || currentStage.stage.id === targetStageId) {
      setActiveType(null);
      return;
    }
    
    try {
      // Atualização otimista
      const deal = currentStage.deals.find((d) => d.id === dealId);
      if (!deal) return;
      
      // Remover deal da stage atual
      const updatedStages = kanbanData.stages.map((s) => {
        if (s.stage.id === currentStage.stage.id) {
          return {
            ...s,
            deals: s.deals.filter((d) => d.id !== dealId),
            deal_count: s.deal_count - 1,
            total_value_cents: s.total_value_cents - (deal.value_cents || 0),
          };
        }
        if (s.stage.id === targetStageId) {
          return {
            ...s,
            deals: [...s.deals, deal],
            deal_count: s.deal_count + 1,
            total_value_cents: s.total_value_cents + (deal.value_cents || 0),
          };
        }
        return s;
      });
      
      setKanbanData({ ...kanbanData, stages: updatedStages });
      
      // Chamar API
      await api(`/api/v1/deals/${dealId}/move`, {
        method: "POST",
        body: JSON.stringify({
          to_stage_id: targetStageId,
          reason: "Drag & drop",
        }),
      });
      
      // Recarregar para garantir sincronização
      await loadKanban();
    } catch (e) {
      console.error("Erro ao mover deal:", e);
      toast({
        title: "Erro ao mover deal",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
      // Reverter em caso de erro
      await loadKanban();
    } finally {
      setActiveType(null);
    }
  }

  if (loading && !kanbanData) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-4">Funil de Vendas</h1>
          </div>
        </div>
        <KanbanSkeleton />
      </motion.div>
    );
  }

  // Renderizar estado de erro
  if (error && !loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Funil de Vendas</h1>
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive font-medium">Erro ao carregar dados</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  loadKanban();
                }}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Funil de Vendas</h1>
          <p className="text-muted-foreground">Gerencie oportunidades e pipeline de vendas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Deal
          </Button>
        </div>
      </div>


      {/* Busca de Clientes */}
      {kanbanData && (
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              setClientPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadKanban();
              }
            }}
            className="max-w-sm"
          />
          <Button variant="outline" size="sm" onClick={loadKanban}>
            Buscar
          </Button>
        </div>
      )}

      {/* Kanban Board */}
      {kanbanData && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* Lista de Clientes (coluna fixa à esquerda) */}
            <ClientsListColumn
              clients={kanbanData.clients}
              onClientClick={(clientId) => {
                // Opcional: mostrar detalhes do cliente
              }}
            />
            
            {/* Colunas do Funil */}
            {kanbanData.stages.map((stageData) => (
              <StageColumn
                key={stageData.stage.id}
                stageData={stageData}
                onDealClick={(dealId) => {
                  setSelectedDealId(dealId);
                  setDealDialogOpen(true);
                }}
              />
            ))}
          </div>
          <DragOverlay>
            {activeId && activeType === "CLIENT" ? (
              <div className="bg-card border rounded-lg p-3 shadow-lg w-64">
                <p className="font-medium text-sm">Arrastando cliente...</p>
              </div>
            ) : activeId && activeType === "DEAL" ? (
              <div className="bg-card border rounded-lg p-3 shadow-lg w-64">
                <p className="font-medium text-sm">Arrastando deal...</p>
              </div>
            ) : activeId && activeType === "STAGE" ? (
              <div className="bg-card border rounded-lg p-3 shadow-lg w-64">
                <p className="font-medium text-sm">Reordenando coluna...</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Deal Detail Dialog */}
      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Deal</DialogTitle>
          </DialogHeader>
          {selectedDealId && <DealDetail dealId={selectedDealId} />}
        </DialogContent>
      </Dialog>

      {/* Modal de Atendimento (criar deal a partir de cliente) */}
      {droppedClient && droppedStageId && (
        <CreateDealModal
          open={clientModalOpen}
          onOpenChange={(open) => {
            setClientModalOpen(open);
            if (!open) {
              setDroppedClient(null);
              setDroppedStageId(null);
            }
          }}
          client={droppedClient}
          stageId={droppedStageId}
          onSuccess={async () => {
            setClientModalOpen(false);
            setDroppedClient(null);
            setDroppedStageId(null);
            await loadKanban();
          }}
        />
      )}
    </motion.div>
  );
}

function StageColumn({
  stageData,
  onDealClick,
}: {
  stageData: StageWithDeals;
  onDealClick: (dealId: number) => void;
}) {
  const { stage, deals, total_value_cents, deal_count } = stageData;
  const [isOverLimit, setIsOverLimit] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `stage-${stage.id}` });

  useEffect(() => {
    if (stage.wip_limit) {
      setIsOverLimit(deal_count >= stage.wip_limit);
    }
  }, [deal_count, stage.wip_limit]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
  });

  return (
    <div className="flex-shrink-0 w-80">
      <div ref={setNodeRef} style={style}>
        <Card
          ref={setDroppableRef}
          className={`h-full flex flex-col ${isOver ? "ring-2 ring-primary" : ""}`}
        >
          <CardHeader
            className="pb-3 cursor-move"
            {...attributes}
            {...listeners}
            style={{
              borderLeft: stage.color ? `4px solid ${stage.color}` : undefined,
            }}
          >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{stage.name}</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {deal_count}
            </span>
          </div>
          {stage.wip_limit && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                WIP: {deal_count}/{stage.wip_limit}
              </span>
              {isOverLimit && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
          )}
          {total_value_cents > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(total_value_cents, "BRL")}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[400px]">
          <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal.id)} />
            ))}
          </SortableContext>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id, data: { type: "DEAL" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm flex-1">{deal.title}</h4>
          <div
            className={`h-2 w-2 rounded-full ${getPriorityColor(deal.priority)}`}
            title={deal.priority}
          />
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{deal.client_nome || `Cliente #${deal.client_id}`}</span>
        </div>
        
        {deal.value_cents && (
          <div className="flex items-center gap-2 text-xs font-medium">
            <DollarSign className="h-3 w-3" />
            <span>{formatCurrency(deal.value_cents, deal.currency)}</span>
            {deal.probability > 0 && (
              <span className="text-muted-foreground">({deal.probability}%)</span>
            )}
          </div>
        )}
        
        {deal.expected_close_date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{new Date(deal.expected_close_date).toLocaleDateString("pt-BR")}</span>
          </div>
        )}
        
        {deal.assignees.length > 0 && (
          <div className="flex items-center gap-1">
            {deal.assignees.slice(0, 3).map((a) => (
              <div
                key={a.user_id}
                className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs"
                title={a.user_nome || ""}
              >
                {a.user_nome?.[0]?.toUpperCase() || "?"}
              </div>
            ))}
            {deal.assignees.length > 3 && (
              <span className="text-xs text-muted-foreground">+{deal.assignees.length - 3}</span>
            )}
          </div>
        )}
        
        {deal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deal.tags.map((t) => (
              <span
                key={t.tag_id}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: t.tag_color ? `${t.tag_color}20` : undefined,
                  color: t.tag_color || undefined,
                }}
              >
                {t.tag_name}
              </span>
            ))}
          </div>
        )}
        
        {deal.has_pending_activity && (
          <div className="flex items-center gap-1 text-xs text-orange-500">
            <AlertCircle className="h-3 w-3" />
            <span>Atividade pendente</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DealDetail({ dealId }: { dealId: number }) {
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeal();
  }, [dealId]);

  async function loadDeal() {
    try {
      const data = await api(`/api/v1/deals/${dealId}`);
      setDeal(data);
    } catch (e) {
      console.error("Erro ao carregar deal:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>Carregando...</p>;
  if (!deal) return <p>Deal não encontrado</p>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">{deal.title}</h3>
        <p className="text-sm text-muted-foreground">Cliente: {deal.client_nome || `#${deal.client_id}`}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {deal.value_cents && (
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="font-medium">{formatCurrency(deal.value_cents, deal.currency)}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground">Probabilidade</p>
          <p className="font-medium">{deal.probability}%</p>
        </div>
      </div>
      
      {/* Adicionar mais detalhes conforme necessário */}
    </div>
  );
}

// Componente: Lista de Clientes (coluna arrastável)
function ClientsListColumn({
  clients,
  onClientClick,
}: {
  clients: ClientListItem[];
  onClientClick: (clientId: number) => void;
}) {
  return (
    <div className="flex-shrink-0 w-80">
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 bg-muted/30">
          <CardTitle className="text-base font-semibold">Clientes</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Arraste para criar deal
          </p>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[400px]">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum cliente encontrado
            </p>
          ) : (
            clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={() => onClientClick(client.id)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientCard({
  client,
  onClick,
}: {
  client: ClientListItem;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `client-${client.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="space-y-1">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm flex-1">{client.nome}</h4>
          {client.has_open_deal && (
            <span className="text-xs bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded">
              No funil
            </span>
          )}
        </div>
        {client.razao_social && (
          <p className="text-xs text-muted-foreground">{client.razao_social}</p>
        )}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {client.email && (
            <div className="flex items-center gap-1">
              <span>📧</span>
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {(client.telefone || client.celular) && (
            <div className="flex items-center gap-1">
              <span>📞</span>
              <span>{client.celular || client.telefone}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente: Modal de Atendimento (criar deal)
function CreateDealModal({
  open,
  onOpenChange,
  client,
  stageId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientListItem | null;
  stageId: number | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    value_cents: null as number | null,
    probability: 0,
    expected_close_date: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    source: "" as "" | "inbound" | "outbound" | "indicacao" | "evento" | "rede_social" | "outro",
    assigned_user_ids: [] as number[],
    initial_note: "",
    create_followup: false,
    followup_due_at: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (client && open) {
      setForm({
        title: `Atendimento - ${client.nome}`,
        value_cents: null,
        probability: 0,
        expected_close_date: "",
        priority: "normal",
        source: "",
        assigned_user_ids: [],
        initial_note: "",
        create_followup: false,
        followup_due_at: "",
      });
      setError(null);
    }
  }, [client, open]);

  async function handleSubmit() {
    if (!client || !stageId) return;
    if (!form.title.trim()) {
      setError("Título é obrigatório");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const valueCents = form.value_cents ? Math.round(form.value_cents * 100) : null;
      const expectedCloseDate = form.expected_close_date
        ? new Date(form.expected_close_date).toISOString().split("T")[0]
        : null;
      const followupDueAt = form.create_followup && form.followup_due_at
        ? new Date(form.followup_due_at).toISOString()
        : null;

      await api("/api/v1/deals/from-client", {
        method: "POST",
        body: JSON.stringify({
          client_id: client.id,
          pipeline_id: null, // Backend vai buscar pipeline padrão automaticamente
          stage_id: stageId,
          title: form.title,
          value_cents: valueCents,
          currency: "BRL",
          probability: form.probability,
          expected_close_date: expectedCloseDate,
          priority: form.priority,
          source: form.source || null,
          assigned_user_ids: form.assigned_user_ids,
          tag_ids: [],
          initial_note: form.initial_note || null,
          create_followup_activity: form.create_followup,
          followup_due_at: followupDueAt,
        }),
      });

      onSuccess();
    } catch (e) {
      console.error("Erro ao criar deal:", e);
      setError(e instanceof Error ? e.message : "Erro ao criar deal");
    } finally {
      setLoading(false);
    }
  }

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Atendimento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Criar deal para: <strong>{client.nome}</strong>
          </p>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Atendimento - Cliente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Valor Estimado (R$)</label>
              <Input
                type="text"
                value={form.value_cents ? (form.value_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                onChange={(e) => {
                  // Remover tudo exceto números e vírgula/ponto
                  const cleaned = e.target.value.replace(/[^\d,.-]/g, "").replace(",", ".");
                  const val = parseFloat(cleaned);
                  setForm((f) => ({ ...f, value_cents: isNaN(val) ? null : Math.round(val * 100) }));
                }}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Probabilidade (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.probability}
                onChange={(e) =>
                  setForm((f) => ({ ...f, probability: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Previsão de Fechamento</label>
              <Input
                type="date"
                value={form.expected_close_date}
                onChange={(e) => setForm((f) => ({ ...f, expected_close_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prioridade</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as any }))
                }
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Origem</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as any }))}
            >
              <option value="">Selecione...</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
              <option value="indicacao">Indicação</option>
              <option value="evento">Evento</option>
              <option value="rede_social">Rede Social</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Notas Iniciais</label>
            <Textarea
              value={form.initial_note}
              onChange={(e) => setForm((f) => ({ ...f, initial_note: e.target.value }))}
              placeholder="Observações iniciais sobre o atendimento..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create_followup"
              checked={form.create_followup}
              onChange={(e) => setForm((f) => ({ ...f, create_followup: e.target.checked }))}
              className="rounded border-input"
            />
            <label htmlFor="create_followup" className="text-sm font-medium">
              Criar atividade de follow-up
            </label>
          </div>

          {form.create_followup && (
            <div>
              <label className="text-sm font-medium">Data do Follow-up</label>
              <Input
                type="datetime-local"
                value={form.followup_due_at}
                onChange={(e) => setForm((f) => ({ ...f, followup_due_at: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Criando..." : "Criar Deal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

