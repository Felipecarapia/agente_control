"use client";

import { useEffect, useState, useCallback } from "react";
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
  Mail,
  Phone,
  MapPin,
  Building2,
  UserCircle,
  X,
  ChevronRight,
  Star,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Archive,
  Tag,
  Clock,
  TrendingUp,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
} from "lucide-react";

type Cliente = {
  id: string;
  tipo: string;
  nome: string;
  razao_social: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cidade: string | null;
  estado: string | null;
  created_at?: string;
};

export default function ClientesPage() {
  const [list, setList] = useState<Cliente[]>([]);
  const [filteredList, setFilteredList] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showContactInfo, setShowContactInfo] = useState(true);

  async function loadList() {
    setLoading(true);
    try {
      const response = await api<Cliente[]>("/api/v1/clientes");
      const data = Array.isArray(response) ? response : [];
      setList(data);
      setFilteredList(data);
    } catch (e) {
      setList([]);
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
      filtered = filtered.filter(
        (c) =>
          c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.telefone?.includes(searchQuery) ||
          c.celular?.includes(searchQuery)
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((c) => c.tipo === typeFilter);
    }

    setFilteredList(filtered);
  }, [searchQuery, typeFilter, list]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredList.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        setSelectedClient(filteredList[focusedIndex]);
      } else if (e.key === "Escape") {
        setSelectedClient(null);
        setFocusedIndex(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, filteredList]);

  async function remove() {
    if (!deleteId) return;
    try {
      await api(`/api/v1/clientes/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      loadList();
    } catch (e: any) {
      alert(e?.message || "Erro ao excluir cliente");
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

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function getAvatarColor(name: string): string {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-purple-500 to-purple-600",
      "from-pink-500 to-pink-600",
      "from-green-500 to-green-600",
      "from-orange-500 to-orange-600",
      "from-cyan-500 to-cyan-600",
      "from-red-500 to-red-600",
      "from-indigo-500 to-indigo-600",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  function getActivityStatus(createdAt?: string): {
    label: string;
    color: string;
  } {
    if (!createdAt) return { label: "Novo", color: "bg-green-500" };
    const days = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days < 7) return { label: "Ativo", color: "bg-green-500" };
    if (days < 30) return { label: "Recente", color: "bg-blue-500" };
    return { label: "Inativo", color: "bg-gray-400" };
  }

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">
      {/* Ultra Modern Header with Stats */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  {filteredList.length}
                </div>
                {selectedIds.size > 0 && (
                  <div className="px-2.5 py-1 bg-blue-500 text-white rounded-full text-xs font-semibold animate-in fade-in slide-in-from-left-2">
                    {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  {list.filter((c) => getActivityStatus(c.created_at).label === "Ativo").length} ativos
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>{list.filter((c) => c.tipo === "pj").length} PJ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserCircle className="h-3.5 w-3.5" />
                <span>{list.filter((c) => c.tipo === "pf").length} PF</span>
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
              <Link href="/dashboard/clientes/novo">
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Link>
            </Button>
          </div>
        </div>

        {/* Advanced Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes... (⌘K)"
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
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-9 border-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pf">PF</SelectItem>
              <SelectItem value="pj">PJ</SelectItem>
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

            {/* Contact Info Toggle - Visible in both modes */}
            <Button
              variant={showContactInfo ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => setShowContactInfo(!showContactInfo)}
              title={showContactInfo ? "Ocultar informações" : "Mostrar informações"}
            >
              {showContactInfo ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1 ml-2 animate-in fade-in slide-in-from-right-2">
              <Button variant="outline" size="sm" className="h-9">
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-destructive"
                onClick={() => {
                  if (confirm(`Excluir ${selectedIds.size} clientes?`)) {
                    // Bulk delete logic
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

      {/* Innovative List/Grid */}
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
              {searchQuery || typeFilter !== "all"
                ? "Nenhum resultado"
                : "Comece sua jornada"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery || typeFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Adicione seu primeiro cliente e construa relacionamentos"}
            </p>
            {!searchQuery && typeFilter === "all" && (
              <Button asChild size="sm" className="shadow-lg shadow-primary/25">
                <Link href="/dashboard/clientes/novo">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Cliente
                </Link>
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
            {filteredList.map((cliente) => {
              const isSelected = selectedIds.has(cliente.id);
              const status = getActivityStatus(cliente.created_at);

              return (
                <div
                  key={cliente.id}
                  className={`group relative bg-card border rounded-xl p-5 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer ${isSelected ? "bg-primary/5 border-primary shadow-sm" : ""
                    }`}
                  onClick={() => setSelectedClient(cliente)}
                >
                  {/* Checkbox */}
                  <div className="absolute top-3 right-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(cliente.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={`transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                    />
                  </div>

                  {/* Avatar */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarColor(
                          cliente.nome
                        )} flex items-center justify-center text-white font-semibold text-sm shadow-md`}
                      >
                        {getInitials(cliente.nome)}
                      </div>
                      <div
                        className={`absolute -top-1 -right-1 w-3 h-3 ${status.color} rounded-full border-2 border-background animate-pulse`}
                      />
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded border-2 border-background flex items-center justify-center ${cliente.tipo === "pj" ? "bg-blue-500" : "bg-gray-500"
                          }`}
                      >
                        {cliente.tipo === "pj" ? (
                          <Building2 className="h-2.5 w-2.5 text-white" />
                        ) : (
                          <UserCircle className="h-2.5 w-2.5 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate mb-0.5">
                        {cliente.nome}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {cliente.tipo === "pj" ? "Pessoa Jurídica" : "Pessoa Física"}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {showContactInfo && (
                    <div className="space-y-2 mb-4">
                      {cliente.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{cliente.email}</span>
                        </div>
                      )}
                      {(cliente.telefone || cliente.celular) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{cliente.telefone || cliente.celular}</span>
                        </div>
                      )}
                      {cliente.cidade && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {cliente.cidade}
                            {cliente.estado && `, ${cliente.estado}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className={`flex items-center gap-2 border-t opacity-0 group-hover:opacity-100 transition-opacity ${showContactInfo ? "pt-3" : "pt-2 mt-2"
                    }`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/dashboard/clientes/${cliente.id}`;
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
                        setDeleteId(cliente.id);
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
            {/* Select All Header */}
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
              <div className="ml-auto text-xs text-muted-foreground">
                Use ↑↓ para navegar • Enter para abrir • Esc para fechar
              </div>
            </div>

            <div className="space-y-0.5 pb-6">
              {filteredList.map((cliente, index) => {
                const isHovered = hoveredId === cliente.id;
                const isSelected = selectedIds.has(cliente.id);
                const isFocused = focusedIndex === index;
                const status = getActivityStatus(cliente.created_at);

                return (
                  <div
                    key={cliente.id}
                    className={`group relative bg-card border rounded-lg transition-all duration-200 ${isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : isHovered || isFocused
                        ? "shadow-md border-primary/50 scale-[1.005]"
                        : "hover:bg-accent/30"
                      }`}
                    onMouseEnter={() => setHoveredId(cliente.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex items-center gap-3 p-2.5">
                      {/* Checkbox */}
                      <div
                        className={`transition-all ${isHovered || isSelected ? "opacity-100" : "opacity-0"
                          }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(cliente.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Avatar with Status */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getAvatarColor(
                            cliente.nome
                          )} flex items-center justify-center text-white font-semibold text-xs shadow-sm cursor-pointer hover:scale-110 transition-transform`}
                          onClick={() => setSelectedClient(cliente)}
                        >
                          {getInitials(cliente.nome)}
                        </div>
                        {/* Activity Indicator */}
                        <div
                          className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 ${status.color} rounded-full border-2 border-background animate-pulse`}
                          title={status.label}
                        />
                        {/* Type Badge */}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded border-2 border-background flex items-center justify-center ${cliente.tipo === "pj" ? "bg-blue-500" : "bg-gray-500"
                            }`}
                        >
                          {cliente.tipo === "pj" ? (
                            <Building2 className="h-2 w-2 text-white" />
                          ) : (
                            <UserCircle className="h-2 w-2 text-white" />
                          )}
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div
                        className={`flex-1 min-w-0 grid gap-2 cursor-pointer ${showContactInfo
                            ? "grid-cols-1 md:grid-cols-4"
                            : "grid-cols-1"
                          }`}
                        onClick={() => setSelectedClient(cliente)}
                      >
                        {/* Name */}
                        <div className="min-w-0">
                          <h3
                            className={`font-semibold text-sm truncate transition-colors ${isHovered ? "text-primary" : ""
                              }`}
                          >
                            {cliente.nome}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {cliente.tipo === "pj" ? "Empresa" : "Pessoa"}
                          </p>
                        </div>

                        {/* Contact */}
                        {showContactInfo && (
                          <div className="min-w-0 hidden md:block">
                            {cliente.email && (
                              <div className="flex items-center gap-1.5 text-xs mb-0.5">
                                <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate text-muted-foreground">
                                  {cliente.email}
                                </span>
                              </div>
                            )}
                            {(cliente.telefone || cliente.celular) && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">
                                  {cliente.telefone || cliente.celular}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Location */}
                        {showContactInfo && (
                          <div className="min-w-0 hidden lg:block">
                            {cliente.cidade && (
                              <div className="flex items-center gap-1.5 text-xs">
                                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate text-muted-foreground">
                                  {cliente.cidade}
                                  {cliente.estado && `, ${cliente.estado}`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Status */}
                        {showContactInfo && (
                          <div className="min-w-0 hidden xl:block">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 ${status.color} rounded-full`} />
                              <span className="text-xs text-muted-foreground">
                                {status.label}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 transition-all ${isHovered
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-90"
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(cliente.email || "");
                          }}
                          title="Copiar email"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 transition-all ${isHovered
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-90"
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/dashboard/clientes/${cliente.id}`;
                          }}
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>

                        {/* Context Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 transition-all ${isHovered
                                ? "opacity-100 scale-100"
                                : "opacity-0 scale-90"
                                }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => setSelectedClient(cliente)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                (window.location.href = `/dashboard/clientes/${cliente.id}`)
                              }
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              Copiar email
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ExternalLink className="h-3.5 w-3.5 mr-2" />
                              Abrir em nova aba
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Archive className="h-3.5 w-3.5 mr-2" />
                              Arquivar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(cliente.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground transition-all ${isHovered
                            ? "opacity-100 translate-x-0"
                            : "opacity-0 -translate-x-2"
                            }`}
                        />
                      </div>
                    </div>

                    {/* Focus/Hover Border */}
                    {(isHovered || isFocused) && (
                      <div className="absolute inset-0 rounded-lg border-2 border-primary/30 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Enhanced Details Drawer */}
      <Sheet
        open={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          {selectedClient && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getAvatarColor(
                      selectedClient.nome
                    )} flex items-center justify-center text-white font-bold text-xl shadow-lg relative`}
                  >
                    {getInitials(selectedClient.nome)}
                    <div
                      className={`absolute -top-1 -right-1 w-4 h-4 ${getActivityStatus(selectedClient.created_at).color
                        } rounded-full border-2 border-background animate-pulse`}
                    />
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-2xl mb-1">
                      {selectedClient.nome}
                    </SheetTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedClient.tipo === "pj"
                          ? "Pessoa Jurídica"
                          : "Pessoa Física"}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        {getActivityStatus(selectedClient.created_at).label}
                      </span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                {/* Contact Info */}
                <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-4 space-y-3 border">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Informações de Contato</h4>
                  </div>
                  {selectedClient.email && (
                    <div className="flex items-start gap-3 group">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm">{selectedClient.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          navigator.clipboard.writeText(selectedClient.email || "")
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {(selectedClient.telefone || selectedClient.celular) && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm">
                          {selectedClient.telefone || selectedClient.celular}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedClient.cidade && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Localização</p>
                        <p className="text-sm">
                          {selectedClient.cidade}
                          {selectedClient.estado && `, ${selectedClient.estado}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-muted-foreground">Projetos</div>
                  </div>
                  <div className="bg-card border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-muted-foreground">Contratos</div>
                  </div>
                  <div className="bg-card border rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">R$ 0</div>
                    <div className="text-xs text-muted-foreground">Valor Total</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button asChild className="w-full shadow-lg shadow-primary/20">
                    <Link href={`/dashboard/clientes/${selectedClient.id}`}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar Cliente
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
                        setDeleteId(selectedClient.id);
                        setSelectedClient(null);
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
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente será permanentemente removido.
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
