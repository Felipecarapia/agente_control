"use client";

import {
  Clock,
  EyeOff,
  Folders,
  Repeat,
  BarChart3,
  MessageSquareX,
  AlertTriangle,
} from "lucide-react";
import { getDataString, findHighlightMatchRelaxed } from "./utils";

type Props = {
  data: Record<string, unknown>;
};

type DorItem = {
  titulo?: string;
  descricao?: string;
  icone?: string;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  clock: Clock,
  "eye-off": EyeOff,
  folders: Folders,
  repeat: Repeat,
  "bar-chart": BarChart3,
  "message-x": MessageSquareX,
  alert: AlertTriangle,
};

// Mapeamento de cores para classes Tailwind
const COLOR_CLASSES: Record<string, {
  text: string;
  bg: string;
  bgHover: string;
  border: string;
  borderHover: string;
  line: string;
}> = {
  green: {
    text: "text-green-400",
    bg: "bg-green-500/10",
    bgHover: "group-hover:bg-green-500/20",
    border: "border-green-500/30",
    borderHover: "hover:border-green-500/50",
    line: "bg-green-500",
  },
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    bgHover: "group-hover:bg-orange-500/20",
    border: "border-orange-500/30",
    borderHover: "hover:border-orange-500/50",
    line: "bg-orange-500",
  },
  red: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    bgHover: "group-hover:bg-red-500/20",
    border: "border-red-500/30",
    borderHover: "hover:border-red-500/50",
    line: "bg-red-500",
  },
  cyan: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    bgHover: "group-hover:bg-cyan-500/20",
    border: "border-cyan-500/30",
    borderHover: "hover:border-cyan-500/50",
    line: "bg-cyan-500",
  },
  purple: {
    text: "text-purple-400",
    bg: "bg-purple-500/10",
    bgHover: "group-hover:bg-purple-500/20",
    border: "border-purple-500/30",
    borderHover: "hover:border-purple-500/50",
    line: "bg-purple-500",
  },
  yellow: {
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
    bgHover: "group-hover:bg-yellow-500/20",
    border: "border-yellow-500/30",
    borderHover: "hover:border-yellow-500/50",
    line: "bg-yellow-500",
  },
};

export function DoresClienteSection({ data }: Props) {
  const titulo = getDataString(data, "titulo") || "Você está passando por isso?";
  const tituloHighlight = getDataString(data, "titulo_highlight");
  const subtitulo = getDataString(data, "subtitulo");
  const cor = getDataString(data, "cor") || "green";
  const items = (data.items as DorItem[]) ?? [];

  const colors = COLOR_CLASSES[cor] || COLOR_CLASSES.green;

  // Renderiza título com destaque
  const renderTitulo = () => {
    if (!tituloHighlight) {
      return <span>{titulo}</span>;
    }
    const match = findHighlightMatchRelaxed(titulo, tituloHighlight);
    if (match) {
      const idx = match.index;
      const before = titulo.slice(0, idx);
      const highlighted = titulo.slice(idx, idx + match.length);
      const after = titulo.slice(idx + match.length);
      return (
        <>
          {before}
          <span className={colors.text}>{highlighted}</span>
          {after}
        </>
      );
    }
    return (
      <>
        {titulo} <span className={colors.text}>{tituloHighlight}</span>
      </>
    );
  };

  return (
    <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        {/* Título */}
        <div className="text-center mb-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            {renderTitulo()}
          </h2>
        </div>

        {/* Linha separadora */}
        <div className={`mx-auto mb-6 h-1 w-24 rounded-full ${colors.line}`} />

        {/* Subtítulo */}
        {subtitulo && (
          <p className="text-center text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
            {subtitulo}
          </p>
        )}

        {/* Grid de 6 cards (3 colunas no desktop, 2 no tablet, 1 no mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, idx) => {
            const IconComponent = ICON_MAP[item.icone || "alert"] || AlertTriangle;
            return (
              <div
                key={idx}
                className={`group relative rounded-xl border border-slate-700/80 bg-slate-800/60 p-6 transition-all duration-300 ${colors.borderHover} hover:bg-slate-800`}
              >
                {/* Ícone */}
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-lg ${colors.bg} ${colors.border} transition-colors ${colors.bgHover}`}>
                  <IconComponent className={`h-7 w-7 ${colors.text}`} />
                </div>

                {/* Título do card */}
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.titulo || `Desafio ${idx + 1}`}
                </h3>

                {/* Descrição */}
                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.descricao || "Descrição do problema enfrentado pelo cliente."}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
