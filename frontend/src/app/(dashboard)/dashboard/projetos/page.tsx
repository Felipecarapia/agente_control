"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Download,
  Upload,
  Pencil,
  Trash2,
  FolderKanban,
  User,
  DollarSign,
  Calendar,
  X,
  ChevronRight,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Archive,
  TrendingUp,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Clock,
  Tag,
} from "lucide-react";

const TIPO_LABEL: Record<string, string> = {
  desenvolvimento_software: "Desenvolvimento",
  marketing: "Marketing",
  infoproduto: "Infoproduto",
  lancamento: "Lançamento",
};

type Cliente = { id: string; nome: string };
type Projeto = {
  id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  cliente_id: string;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  valor_orcado: string | number | null;
  moeda: string;
  created_at?: string;
};

export default function ProjetosPage() {
  const [list, setList] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredList, setFilteredList] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Projeto | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showDetails, setShowDetails] = useState(true);

  async function loadList() {
    setLoading(true);
    try {
      const [projetos, clientesData] = await Promise.all([
        api<Projeto[]>("/api/v1/projetos"),
        api<Cliente[]>("/api/v1/clientes"),
      ]);
      setList(Array.isArray(projetos) ? projetos : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setFilteredList(Array.isArray(projetos) ? projetos : []);
    } catch (e) {
      setList([]);
      setClientes([]);
      setFilteredList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    let filtered = [...list];

    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.nome.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredList(filtered);
  }, [searchQuery, statusFilter, list]);

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/projetos/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadList();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir projeto");
    }
  }

  function toggleSelect(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function selectAll() {
    if (selectedIds.size === filteredList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map((p) => p.id)));
    }
  }

  function getClienteNome(clienteId: string): string {
    return clientes.find((c) => c.id === clienteId)?.nome || "—";
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function getAvatarColor(name: string): string {
    if (!name) return "from-gray-500 to-gray-600";
    const colors = [
      "from-blue-500 to-blue-600",
      "from-indigo-500 to-indigo-600",
      "from-violet-500 to-violet-600",
      "from-purple-500 to-purple-600",
      "from-cyan-500 to-blue-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      planejamento: "bg-blue-500",
      em_andamento: "bg-yellow-500",
      concluido: "bg-green-500",
      cancelado: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      planejamento: "Planejamento",
      em_andamento: "Em Andamento",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  }

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  {filteredList.length}
                </div>
                {selectedIds.size > 0 && (
                  <div className="px-2.5 py-1 bg-blue-500 text-white rounded-full text-xs font-semibold animate-in fade-in">
                    {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  {list.filter((p) => p.status === "em_andamento").length} em andamento
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5" />
                <span>{list.filter((p) => p.status === "concluido").length} concluídos</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button asChild size="sm" className="h-9 bg-primary shadow-lg shadow-primary/25">
              <Link href="/dashboard/projetos/novo">
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Link>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background border-2 focus:border-primary"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="planejamento">Planejamento</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border-2 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="h-9 rounded-none border-0"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="h-9 rounded-none border-0"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            {/* Details Toggle */}
            <Button
              variant={showDetails ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => setShowDetails(!showDetails)}
              title={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
            >
              {showDetails ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1 ml-2 animate-in fade-in">
              <Button variant="outline" size="sm" className="h-9">
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-destructive"
                onClick={() => {
                  if (confirm(`Excluir ${selectedIds.size} projetos?`)) {
                    // Bulk delete
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-48 bg-card border rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 bg-card border rounded-lg animate-pulse" />
              ))}
            </div>
          )
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {searchQuery || statusFilter !== "all" ? "Nenhum resultado" : "Nenhum projeto"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Crie seu primeiro projeto"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button asChild size="sm" className="shadow-lg shadow-primary/25">
                <Link href="/dashboard/projetos/novo">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Projeto
                </Link>
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
            {filteredList.map((projeto) => {
              const isSelected = selectedIds.has(projeto.id);

              return (
                <div
                  key={projeto.id}
                  className={`group relative bg-card border rounded-xl p-5 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer ${isSelected ? "bg-primary/5 border-primary shadow-sm" : ""
                    }`}
                  onClick={() => setSelectedProject(projeto)}
                >
                  <div className="absolute top-3 right-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(projeto.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={`transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                    />
                  </div>

                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(
                          projeto.nome
                        )} flex items-center justify-center text-white font-semibold text-sm shadow-md`}
                      >
                        <FolderKanban className="h-6 w-6" />
                      </div>
                      <div
                        className={`absolute -top-1 -right-1 w-3 h-3 ${getStatusColor(
                          projeto.status
                        )} rounded-full border-2 border-background animate-pulse`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate mb-0.5">{projeto.nome}</h3>
                      <p className="text-xs text-muted-foreground">
                        {TIPO_LABEL[projeto.tipo] || projeto.tipo}
                      </p>
                    </div>
                  </div>

                  {showDetails && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{getClienteNome(projeto.cliente_id)}</span>
                      </div>
                      {projeto.valor_orcado && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3 flex-shrink-0" />
                          <span>
                            {projeto.moeda} {Number(projeto.valor_orcado).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      )}
                      {projeto.data_inicio && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>{new Date(projeto.data_inicio).toLocaleDateString("pt-BR")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`flex items-center gap-2 border-t opacity-0 group-hover:opacity-100 transition-opacity ${showDetails ? "pt-3" : "pt-2 mt-2"
                      }`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/dashboard/projetos/${projeto.id}`;
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(projeto.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <>
            <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-muted/50 rounded-lg border">
              <Checkbox
                checked={selectedIds.size === filteredList.length}
                onCheckedChange={selectAll}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} de ${filteredList.length} selecionados`
                  : "Selecionar todos"}
              </span>
            </div>

            <div className="space-y-0.5 pb-6">
              {filteredList.map((projeto) => {
                const isHovered = hoveredId === projeto.id;
                const isSelected = selectedIds.has(projeto.id);

                return (
                  <div
                    key={projeto.id}
                    className={`group relative bg-card border rounded-lg transition-all duration-200 ${isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : isHovered
                        ? "shadow-md border-primary/50 scale-[1.005]"
                        : "hover:bg-accent/30"
                      }`}
                    onMouseEnter={() => setHoveredId(projeto.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex items-center gap-3 p-2.5">
                      <div
                        className={`transition-all ${isHovered || isSelected ? "opacity-100" : "opacity-0"
                          }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(projeto.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarColor(
                            projeto.nome
                          )} flex items-center justify-center text-white shadow-sm cursor-pointer hover:scale-110 transition-transform`}
                          onClick={() => setSelectedProject(projeto)}
                        >
                          <FolderKanban className="h-4 w-4" />
                        </div>
                        <div
                          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 ${getStatusColor(
                            projeto.status
                          )} rounded-full border-2 border-background animate-pulse`}
                        />
                      </div>

                      <div
                        className={`flex-1 min-w-0 grid gap-2 cursor-pointer ${showDetails ? "grid-cols-1 md:grid-cols-4" : "grid-cols-1"
                          }`}
                        onClick={() => setSelectedProject(projeto)}
                      >
                        <div className="min-w-0">
                          <h3
                            className={`font-semibold text-sm truncate transition-colors ${isHovered ? "text-primary" : ""
                              }`}
                          >
                            {projeto.nome}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {TIPO_LABEL[projeto.tipo] || projeto.tipo}
                          </p>
                        </div>

                        {showDetails && (
                          <>
                            <div className="min-w-0 hidden md:block">
                              <div className="flex items-center gap-1.5 text-xs mb-0.5">
                                <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate text-muted-foreground">
                                  {getClienteNome(projeto.cliente_id)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">
                                  {getStatusLabel(projeto.status)}
                                </span>
                              </div>
                            </div>

                            <div className="min-w-0 hidden lg:block">
                              {projeto.valor_orcado && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate text-muted-foreground">
                                    {projeto.moeda}{" "}
                                    {Number(projeto.valor_orcado).toLocaleString("pt-BR")}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 hidden xl:block">
                              {projeto.data_inicio && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-muted-foreground">
                                    {new Date(projeto.data_inicio).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 transition-all ${isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/dashboard/projetos/${projeto.id}`;
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 transition-all ${isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
                                }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setSelectedProject(projeto)}>
                              <Eye className="h-3.5 w-3.5 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                (window.location.href = `/dashboard/projetos/${projeto.id}`)
                              }
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Archive className="h-3.5 w-3.5 mr-2" />
                              Arquivar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(projeto.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground transition-all ${isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                            }`}
                        />
                      </div>
                    </div>

                    {isHovered && (
                      <div className="absolute inset-0 rounded-lg border-2 border-primary/30 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Details Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          {selectedProject && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getAvatarColor(
                      selectedProject.nome
                    )} flex items-center justify-center text-white shadow-lg relative`}
                  >
                    <FolderKanban className="h-8 w-8" />
                    <div
                      className={`absolute -top-1 -right-1 w-4 h-4 ${getStatusColor(
                        selectedProject.status
                      )} rounded-full border-2 border-background animate-pulse`}
                    />
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-2xl mb-1">{selectedProject.nome}</SheetTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {TIPO_LABEL[selectedProject.tipo] || selectedProject.tipo}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {getStatusLabel(selectedProject.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-4 space-y-3 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Informações do Projeto</h4>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="text-sm">{getClienteNome(selectedProject.cliente_id)}</p>
                    </div>
                  </div>
                  {selectedProject.valor_orcado && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Valor Orçado</p>
                        <p className="text-sm">
                          {selectedProject.moeda}{" "}
                          {Number(selectedProject.valor_orcado).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedProject.data_inicio && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Data de Início</p>
                        <p className="text-sm">
                          {new Date(selectedProject.data_inicio).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Button asChild className="w-full shadow-lg shadow-primary/20">
                    <Link href={`/dashboard/projetos/${selectedProject.id}`}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar Projeto
                    </Link>
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="w-full">
                      <Archive className="h-4 w-4 mr-2" />
                      Arquivar
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => {
                        setDeleteId(selectedProject.id);
                        setSelectedProject(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
