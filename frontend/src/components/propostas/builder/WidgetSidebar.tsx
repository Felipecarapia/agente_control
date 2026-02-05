"use client";

import { useState } from "react";
import {
  MousePointer,
  MessageSquare,
  HelpCircle,
  Megaphone,
  Play,
  Users,
  Briefcase,
  ListOrdered,
  Building2,
  FolderOpen,
  Trophy,
  Search,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Layers,
  ShieldCheck,
  ArrowRightCircle,
  FileText,
  Award,
  Phone,
} from "lucide-react";
import { SECTION_TYPE_LABELS, type SectionType } from "../landing-section-types";

const WIDGET_ICONS: Record<SectionType, React.ComponentType<{ className?: string }>> = {
  hero: Megaphone,
  beneficios: ListOrdered,
  oferta: Briefcase,
  depoimentos: MessageSquare,
  faq: HelpCircle,
  cta: MousePointer,
  video: Play,
  para_quem: Users,
  quem_somos: Building2,
  sobre_projeto: FolderOpen,
  servicos_valores: ListOrdered,
  nossos_clientes: Building2,
  cases_sucesso: Trophy,
  dores_cliente: AlertTriangle,
  produtos_alternados: Layers,
  time: Users,
  garantia: ShieldCheck,
  proximos_passos: ArrowRightCircle,
  resumo_proposta: FileText,
  diferenciais: Award,
  rodape: Phone,
};

const WIDGET_CATEGORIES: { label: string; types: SectionType[] }[] = [
  {
    label: "Layout",
    types: ["hero", "cta", "video"],
  },
  {
    label: "Básico",
    types: ["dores_cliente", "produtos_alternados", "quem_somos", "sobre_projeto", "para_quem", "beneficios", "servicos_valores", "oferta"],
  },
  {
    label: "Social / Prova",
    types: ["garantia", "diferenciais", "time", "depoimentos", "nossos_clientes", "cases_sucesso", "faq"],
  },
  {
    label: "Fechamento",
    types: ["proximos_passos", "resumo_proposta", "rodape"],
  },
];

export function WidgetSidebar() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"widgets" | "globais">("widgets");
  const [openCategories, setOpenCategories] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
  });

  const toggleCategory = (i: number) => {
    setOpenCategories((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const filteredCategories = WIDGET_CATEGORIES.map((cat) => ({
    ...cat,
    types: cat.types.filter(
      (t) =>
        !search.trim() ||
        SECTION_TYPE_LABELS[t].toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.types.length > 0);

  return (
    <div className="flex h-full flex-col w-72 shrink-0 border-r border-slate-700 bg-slate-900 text-white">
      {/* Título centralizado - estilo Elementor */}
      <div className="shrink-0 border-b border-slate-700 px-4 py-4">
        <h2 className="text-center text-base font-semibold text-white">Elementos</h2>

        {/* Abas Widgets | Globais */}
        <div className="mt-3 flex gap-0">
          <button
            type="button"
            onClick={() => setActiveTab("widgets")}
            className={`flex-1 rounded-t px-2 py-2 text-center text-xs font-medium transition-colors ${
              activeTab === "widgets"
                ? "border-b-2 border-cyan-400 bg-slate-800/80 text-white"
                : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
            }`}
          >
            Widgets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("globais")}
            className={`flex-1 rounded-t px-2 py-2 text-center text-xs font-medium transition-colors ${
              activeTab === "globais"
                ? "border-b-2 border-cyan-400 bg-slate-800/80 text-white"
                : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
            }`}
          >
            Globais
          </button>
        </div>

        {/* Barra de pesquisa com ícone */}
        {activeTab === "widgets" && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Pesquisar widget..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-800 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        )}
      </div>

      {/* Lista rolável de categorias e widgets */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3">
        {activeTab === "globais" ? (
          <div className="rounded-lg bg-slate-800/50 px-3 py-4 text-center text-sm text-slate-500">
            Opções globais em breve.
          </div>
        ) : (
          filteredCategories.map((cat, catIndex) => (
            <div key={cat.label} className="mb-4">
              {/* Cabeçalho da categoria com seta */}
              <button
                type="button"
                onClick={() => toggleCategory(catIndex)}
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hover:bg-slate-800/80"
              >
                {openCategories[catIndex] ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                )}
                {cat.label}
              </button>

              {/* Grid de widgets: ícone em cima, texto embaixo (estilo Elementor) */}
              {openCategories[catIndex] && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {cat.types.map((type) => {
                    const Icon = WIDGET_ICONS[type];
                    return (
                      <div
                        key={type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/widget-type", type);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        className="flex cursor-grab active:cursor-grabbing flex-col items-center justify-center gap-2 rounded-lg border border-slate-600/80 bg-slate-800 py-4 px-2 text-center transition-colors hover:border-cyan-500/50 hover:bg-slate-700/80"
                      >
                        {Icon && (
                          <Icon className="h-7 w-7 shrink-0 text-slate-300" aria-hidden />
                        )}
                        <span className="text-xs font-medium leading-tight text-white">
                          {SECTION_TYPE_LABELS[type]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
