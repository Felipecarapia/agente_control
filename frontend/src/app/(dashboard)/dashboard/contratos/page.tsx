"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label"; // Added Label
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Added Dialog
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
  FileText,
  User,
  FolderKanban,
  DollarSign,
  Calendar,
  X,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Archive,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid,
  List,
  Eye,
  EyeOff,
  Zap,
  Sparkles,
  FileSignature,
  AlertCircle
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  encerrado: "Encerrado",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

type Cliente = { id: string; nome: string };
type Projeto = { id: string; nome: string };
type Contrato = {
  id: string;
  titulo: string;
  descricao: string | null;
  valor: string | number | null;
  cliente_id: string;
  projeto_id: string | null;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  created_at?: string;
};

export default function ContratosPage() {
  const [list, setList] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [filteredList, setFilteredList] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showDetails, setShowDetails] = useState(true);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newContrato, setNewContrato] = useState({
    titulo: "",
    cliente_id: "",
    projeto_id: "none",
    valor: "",
    status: "pendente",
    data_inicio: "",
    data_fim: ""
  });

  async function loadList() {
    setLoading(true);
    try {
      const [contratosData, clientesData, projetosData] = await Promise.all([
        api<Contrato[]>("/api/v1/contratos"),
        api<Cliente[]>("/api/v1/clientes"),
        api<Projeto[]>("/api/v1/projetos"),
      ]);
      setList(Array.isArray(contratosData) ? contratosData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setProjetos(Array.isArray(projetosData) ? projetosData : []);
      setFilteredList(Array.isArray(contratosData) ? contratosData : []);
    } catch (e) {
      setList([]);
      setClientes([]);
      setProjetos([]);
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
      filtered = filtered.filter((c) =>
        c.titulo.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    setFilteredList(filtered);
  }, [searchQuery, statusFilter, list]);

  async function handleCreate() {
    if (!newContrato.titulo || !newContrato.cliente_id) {
      alert("Preencha os campos obrigatórios");
      return;
    }
    setCreating(true);
    try {
      await api("/api/v1/contratos", {
        method: "POST",
        body: JSON.stringify({
          ...newContrato,
          projeto_id: newContrato.projeto_id === "none" ? null : newContrato.projeto_id,
          valor: newContrato.valor ? parseFloat(newContrato.valor) : null
        })
      });
      setIsCreateOpen(false);
      setNewContrato({
        titulo: "",
        cliente_id: "",
        projeto_id: "none",
        valor: "",
        status: "pendente",
        data_inicio: "",
        data_fim: ""
      });
      loadList();
    } catch (e: any) {
      alert(e.message || "Erro ao criar contrato");
    } finally {
      setCreating(false);
    }
  }

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/contratos/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadList();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir contrato");
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
      setSelectedIds(new Set(filteredList.map((c) => c.id)));
    }
  }

  function getClienteNome(id: string) {
    return clientes.find((c) => c.id === id)?.nome || "—";
  }

  function getProjetoNome(id: string | null) {
    if (!id) return "—";
    return projetos.find((p) => p.id === id)?.nome || "—";
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "ativo": return "bg-green-500";
      case "pendente": return "bg-yellow-500";
      case "encerrado": return "bg-gray-500";
      case "cancelado": return "bg-red-500";
      default: return "bg-gray-400";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "ativo": return <CheckCircle2 className="h-3 w-3" />;
      case "pendente": return <AlertCircle className="h-3 w-3" />;
      case "encerrado": return <Archive className="h-3 w-3" />;
      case "cancelado": return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  }

  // BLINDADA COM CORRECAO
  function getAvatarColor(title: string): string {
    if (!title) return "from-gray-500 to-gray-600";
    const colors = [
      "from-teal-500 to-teal-600",
      "from-emerald-500 to-emerald-600",
      "from-green-500 to-green-600",
      "from-cyan-500 to-cyan-600",
      "from-sky-500 to-sky-600",
    ];
    const index = title.charCodeAt(0) % colors.length;
    return colors[index];
  }

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  {filteredList.length}
                </div>
                {selectedIds.size > 0 && (
                  <div className="px-2.5 py-1 bg-teal-500 text-white rounded-full text-xs font-semibold animate-in fade-in">
                    {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{list.filter(c => c.status === 'ativo').length} ativos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{list.filter(c => c.status === 'pendente').length} pendentes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    list.filter(c => c.status === 'ativo').reduce((acc, curr) => acc + Number(curr.valor || 0), 0)
                  )} em execução
                </span>
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
            {/* Botão Novo corrigido */}
            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="h-9 bg-primary shadow-lg shadow-primary/25">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-2">
          {/* ... Search ... */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contratos..."
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
            <SelectTrigger className="w-[150px] h-9 border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
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
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-destructive"
                onClick={() => {
                  if (confirm(`Excluir ${selectedIds.size} contratos?`)) {
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
              {searchQuery || statusFilter !== "all" ? "Nenhum contrato encontrado" : "Nenhum contrato cadastrado"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Cadastre seu primeiro contrato"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsCreateOpen(true)} size="sm" className="shadow-lg shadow-primary/25">
                <Plus className="h-4 w-4 mr-2" />
                Novo Contrato
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
            {filteredList.map((contrato) => {
              const isSelected = selectedIds.has(contrato.id);
              return (
                <div
                  key={contrato.id}
                  className={`group relative bg-card border rounded-xl p-5 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer ${isSelected ? "bg-primary/5 border-primary shadow-sm" : ""
                    }`}
                  onClick={() => setSelectedContrato(contrato)}
                >
                  <div className="absolute top-3 right-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(contrato.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={`transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                    />
                  </div>

                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(contrato.titulo)} flex items-center justify-center text-white font-semibold text-sm shadow-md`}>
                        <FileSignature className="h-6 w-6" />
                      </div>
                      <div className={`absolute -top-1 -right-1 w-3 h-3 ${getStatusColor(contrato.status)} rounded-full border-2 border-background animate-pulse`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate mb-0.5">{contrato.titulo}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {getStatusIcon(contrato.status)}
                        <span>{STATUS_LABEL[contrato.status]}</span>
                      </div>
                    </div>
                  </div>

                  {showDetails && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{getClienteNome(contrato.cliente_id)}</span>
                      </div>
                      {contrato.valor && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3 flex-shrink-0" />
                          <span className="font-medium text-foreground">
                            {Number(contrato.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        </div>
                      )}
                      {contrato.data_fim && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>Fim: {new Date(contrato.data_fim).toLocaleDateString("pt-BR")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`flex items-center gap-2 border-t opacity-0 group-hover:opacity-100 transition-opacity ${showDetails ? "pt-3" : "pt-2 mt-2"
                    }`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/dashboard/contratos/${contrato.id}`;
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
                        setDeleteId(contrato.id);
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
              {filteredList.map((contrato) => {
                const isHovered = hoveredId === contrato.id;
                const isSelected = selectedIds.has(contrato.id);

                return (
                  <div
                    key={contrato.id}
                    className={`group relative bg-card border rounded-lg transition-all duration-200 ${isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : isHovered
                        ? "shadow-md border-primary/50 scale-[1.005]"
                        : "hover:bg-accent/30"
                      }`}
                    onMouseEnter={() => setHoveredId(contrato.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex items-center gap-3 p-2.5">
                      <div className={`transition-all ${isHovered || isSelected ? "opacity-100" : "opacity-0"}`}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(contrato.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarColor(contrato.titulo)} flex items-center justify-center text-white shadow-sm cursor-pointer hover:scale-110 transition-transform`}
                          onClick={() => setSelectedContrato(contrato)}
                        >
                          <FileSignature className="h-4 w-4" />
                        </div>
                        <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 ${getStatusColor(contrato.status)} rounded-full border-2 border-background animate-pulse`} />
                      </div>

                      <div className={`flex-1 min-w-0 grid gap-2 cursor-pointer ${showDetails ? "grid-cols-1 md:grid-cols-4" : "grid-cols-1"}`} onClick={() => setSelectedContrato(contrato)}>
                        <div className="min-w-0">
                          <h3 className={`font-semibold text-sm truncate transition-colors ${isHovered ? "text-primary" : ""}`}>{contrato.titulo}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground md:hidden">
                            {getStatusIcon(contrato.status)}
                            <span>{STATUS_LABEL[contrato.status]}</span>
                          </div>
                        </div>

                        {showDetails && (
                          <>
                            <div className="min-w-0 hidden md:block">
                              <div className="flex items-center gap-1.5 text-xs mb-0.5">
                                <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate text-muted-foreground">{getClienteNome(contrato.cliente_id)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                {getStatusIcon(contrato.status)}
                                <span className="text-muted-foreground">{STATUS_LABEL[contrato.status]}</span>
                              </div>
                            </div>

                            <div className="min-w-0 hidden lg:block">
                              {contrato.valor && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <DollarSign className="h-3 w-3 flex-shrink-0" />
                                  <span>{Number(contrato.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 hidden xl:block">
                              {contrato.data_fim && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span>{new Date(contrato.data_fim).toLocaleDateString("pt-BR")}</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {/* Botões de ação da linha - sem alterações significativas */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 transition-all ${isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/dashboard/contratos/${contrato.id}`;
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {/* ... resto dos botões ... */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className={`h-7 w-7 p-0`}>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedContrato(contrato)}>Ver detalhes</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/dashboard/contratos/${contrato.id}`}>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(contrato.id)}>Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Details Sheet - Sem alterações substanciais */}
      <Sheet open={!!selectedContrato} onOpenChange={(open) => !open && setSelectedContrato(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          {/* ... Conteúdo do Sheet ... */}
          {selectedContrato && (
            <div className="p-4">
              <h2 className="text-xl font-bold mb-4">{selectedContrato.titulo}</h2>
              {/* ... detalhes ... */}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* MODAL DE CRIAÇÃO RESTAURADO/CRIADO */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-bold">Novo Contrato</SheetTitle>
            <SheetDescription>
              Preencha os dados abaixo para criar um novo contrato.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <FileSignature className="h-4 w-4" />
                Título do Contrato
              </Label>
              <Input
                value={newContrato.titulo}
                onChange={(e) => setNewContrato({ ...newContrato, titulo: e.target.value })}
                placeholder="Ex: Contrato de Manutenção 2024"
                className="h-12 text-lg font-medium"
              />
            </div>

            {/* Valor e Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Valor (R$)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={newContrato.valor}
                    onChange={(e) => setNewContrato({ ...newContrato, valor: e.target.value })}
                    placeholder="0,00"
                    className="pl-8 h-10"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Status
                </Label>
                <Select
                  value={newContrato.status || "pendente"}
                  disabled
                >
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pendente">Pendente</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            {/* Vínculos */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Vínculos</h3>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Cliente
                </Label>
                <Select
                  value={newContrato.cliente_id}
                  onValueChange={(val) => setNewContrato({ ...newContrato, cliente_id: val })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" /> Projeto (Opcional)
                </Label>
                <Select
                  value={newContrato.projeto_id}
                  onValueChange={(val) => setNewContrato({ ...newContrato, projeto_id: val })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projetos.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                Observações
              </Label>
              <Textarea
                placeholder="Detalhes adicionais do contrato..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t sticky bottom-0 bg-background pb-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 min-w-[140px]">
              {creating ? "Criando..." : "Criar Contrato"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          {/* ... */}
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
