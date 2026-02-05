"use client";

import { findHighlightMatchRelaxed, getDataString } from "./utils";

type Item = { titulo?: string; descricao?: string; valor?: string };
type Data = Record<string, unknown>;

// Cores de destaque
const COR_CLASSES: Record<string, {
  text: string;
  border: string;
  borderLight: string;
  shadow: string;
  line: string;
}> = {
  cyan: {
    text: "text-cyan-400",
    border: "border-cyan-500/40",
    borderLight: "border-cyan-500/50",
    shadow: "shadow-[0_0_24px_rgba(34,211,238,0.08)]",
    line: "bg-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.6)]",
  },
  green: {
    text: "text-green-400",
    border: "border-green-500/40",
    borderLight: "border-green-500/50",
    shadow: "shadow-[0_0_24px_rgba(34,197,94,0.08)]",
    line: "bg-green-400/80 shadow-[0_0_12px_rgba(34,197,94,0.6)]",
  },
  orange: {
    text: "text-orange-400",
    border: "border-orange-500/40",
    borderLight: "border-orange-500/50",
    shadow: "shadow-[0_0_24px_rgba(249,115,22,0.08)]",
    line: "bg-orange-400/80 shadow-[0_0_12px_rgba(249,115,22,0.6)]",
  },
  purple: {
    text: "text-purple-400",
    border: "border-purple-500/40",
    borderLight: "border-purple-500/50",
    shadow: "shadow-[0_0_24px_rgba(168,85,247,0.08)]",
    line: "bg-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.6)]",
  },
  blue: {
    text: "text-blue-400",
    border: "border-blue-500/40",
    borderLight: "border-blue-500/50",
    shadow: "shadow-[0_0_24px_rgba(59,130,246,0.08)]",
    line: "bg-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.6)]",
  },
  yellow: {
    text: "text-yellow-400",
    border: "border-yellow-500/40",
    borderLight: "border-yellow-500/50",
    shadow: "shadow-[0_0_24px_rgba(234,179,8,0.08)]",
    line: "bg-yellow-400/80 shadow-[0_0_12px_rgba(234,179,8,0.6)]",
  },
  red: {
    text: "text-red-400",
    border: "border-red-500/40",
    borderLight: "border-red-500/50",
    shadow: "shadow-[0_0_24px_rgba(239,68,68,0.08)]",
    line: "bg-red-400/80 shadow-[0_0_12px_rgba(239,68,68,0.6)]",
  },
};

// Cores de fundo (tema escuro)
const BG_COR_CLASSES_DARK: Record<string, {
  section: string;
  table: string;
  header: string;
  rowHover: string;
  rowBorder: string;
  textPrimary: string;
  textSecondary: string;
}> = {
  escuro: {
    section: "bg-slate-950",
    table: "bg-slate-900/60",
    header: "bg-slate-800/80",
    rowHover: "hover:bg-slate-800/50",
    rowBorder: "border-slate-700/60",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
  },
  azul_escuro: {
    section: "bg-blue-950",
    table: "bg-blue-900/60",
    header: "bg-blue-800/80",
    rowHover: "hover:bg-blue-800/50",
    rowBorder: "border-blue-700/60",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
  },
  verde_escuro: {
    section: "bg-emerald-950",
    table: "bg-emerald-900/60",
    header: "bg-emerald-800/80",
    rowHover: "hover:bg-emerald-800/50",
    rowBorder: "border-emerald-700/60",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
  },
  roxo_escuro: {
    section: "bg-purple-950",
    table: "bg-purple-900/60",
    header: "bg-purple-800/80",
    rowHover: "hover:bg-purple-800/50",
    rowBorder: "border-purple-700/60",
    textPrimary: "text-white",
    textSecondary: "text-white/80",
  },
};

// Cores de fundo (tema claro)
const BG_COR_CLASSES_LIGHT: Record<string, {
  section: string;
  table: string;
  header: string;
  rowHover: string;
  rowBorder: string;
  textPrimary: string;
  textSecondary: string;
}> = {
  claro: {
    section: "bg-slate-50",
    table: "bg-white",
    header: "bg-slate-100",
    rowHover: "hover:bg-slate-50",
    rowBorder: "border-slate-200",
    textPrimary: "text-slate-900",
    textSecondary: "text-slate-600",
  },
  cinza: {
    section: "bg-slate-200",
    table: "bg-white",
    header: "bg-slate-100",
    rowHover: "hover:bg-slate-50",
    rowBorder: "border-slate-300",
    textPrimary: "text-slate-900",
    textSecondary: "text-slate-600",
  },
};

export function ServicosValoresSection({ data }: { data: Data }) {
  const items = (data.items as Item[]) ?? [];
  const titulo = getDataString(data, "titulo") || "";
  const highlightRaw = getDataString(data, "titulo_highlight") || undefined;
  const cor = getDataString(data, "cor") || "cyan";
  const bgCor = getDataString(data, "bg_cor") || "escuro";
  const valorTotal = getDataString(data, "valor_total");

  if (items.length === 0 && !titulo) return null;

  // Determina se é tema escuro ou claro
  const isDark = ["escuro", "azul_escuro", "verde_escuro", "roxo_escuro"].includes(bgCor);
  const bgColors = isDark
    ? BG_COR_CLASSES_DARK[bgCor] || BG_COR_CLASSES_DARK.escuro
    : BG_COR_CLASSES_LIGHT[bgCor] || BG_COR_CLASSES_LIGHT.claro;
  const colors = COR_CLASSES[cor] || COR_CLASSES.cyan;

  // Ajusta cor do texto de destaque para temas claros
  const accentText = isDark ? colors.text : colors.text.replace("-400", "-600");

  const matchHighlight = findHighlightMatchRelaxed(titulo, highlightRaw);
  const hasHighlight = !!matchHighlight;

  return (
    <section
      className={`relative px-6 py-16 overflow-hidden ${bgColors.section}`}
      style={isDark ? {
        backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      } : undefined}
    >
      <div className="relative max-w-5xl mx-auto">
        {/* Título */}
        {titulo && (
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold ${bgColors.textPrimary}`}>
              {hasHighlight && matchHighlight ? (
                <>
                  {titulo.slice(0, matchHighlight.index)}
                  <span className={accentText}>
                    {titulo.slice(matchHighlight.index, matchHighlight.index + matchHighlight.length)}
                  </span>
                  {titulo.slice(matchHighlight.index + matchHighlight.length)}
                </>
              ) : (
                titulo
              )}
            </h2>
            {(hasHighlight || highlightRaw) && (
              <div className={`mt-2 w-24 h-0.5 mx-auto rounded-full ${colors.line}`} />
            )}
            {highlightRaw && !matchHighlight && (
              <p className={`mt-2 font-semibold text-xl ${accentText}`}>{highlightRaw}</p>
            )}
          </div>
        )}

        {/* Tabela */}
        <div className={`rounded-xl border ${colors.border} overflow-hidden ${bgColors.table} ${colors.shadow}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse">
              <thead>
                <tr className={`border-b ${colors.border} ${bgColors.header}`}>
                  <th className={`text-left py-4 px-5 ${accentText} font-semibold text-sm uppercase tracking-wider`}>
                    Serviço
                  </th>
                  <th className={`text-left py-4 px-5 ${accentText} font-semibold text-sm uppercase tracking-wider hidden sm:table-cell`}>
                    Descrição
                  </th>
                  <th className={`text-right py-4 px-5 ${accentText} font-semibold text-sm uppercase tracking-wider whitespace-nowrap`}>
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={i}
                    className={`border-b ${bgColors.rowBorder} last:border-b-0 ${bgColors.rowHover} transition-colors`}
                  >
                    <td className={`py-4 px-5 ${bgColors.textPrimary} font-medium`}>
                      {item.titulo || "—"}
                    </td>
                    <td className={`py-4 px-5 ${bgColors.textSecondary} text-sm leading-relaxed hidden sm:table-cell max-w-xs`}>
                      {item.descricao || "—"}
                    </td>
                    <td className="py-4 px-5 text-right">
                      {item.valor ? (
                        <span className={`${accentText} font-semibold whitespace-nowrap`}>
                          {item.valor}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={`border-t-2 ${colors.borderLight} ${bgColors.header}`}>
                  <td className={`py-4 px-5 ${bgColors.textPrimary} font-bold`} colSpan={2}>
                    Total
                  </td>
                  <td className="py-4 px-5 text-right">
                    {valorTotal ? (
                      <span className={`${accentText} font-bold text-lg whitespace-nowrap`}>
                        {valorTotal}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
