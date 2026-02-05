"use client";

import { Users } from "lucide-react";
import { findHighlightMatchRelaxed, getDataString } from "./utils";

type TimeMember = {
  nome?: string;
  instagram?: string;
  funcao?: string;
  foto_url?: string;
};

type Data = Record<string, unknown>;

const COLOR_CLASSES: Record<
  string,
  { accentText: string; accentTextDark: string; line: string; ring: string }
> = {
  cyan: {
    accentText: "text-cyan-400",
    accentTextDark: "text-cyan-600",
    line: "bg-cyan-500",
    ring: "ring-cyan-500/30",
  },
  green: {
    accentText: "text-green-400",
    accentTextDark: "text-green-600",
    line: "bg-green-500",
    ring: "ring-green-500/30",
  },
  orange: {
    accentText: "text-orange-400",
    accentTextDark: "text-orange-600",
    line: "bg-orange-500",
    ring: "ring-orange-500/30",
  },
  purple: {
    accentText: "text-purple-400",
    accentTextDark: "text-purple-600",
    line: "bg-purple-500",
    ring: "ring-purple-500/30",
  },
  blue: {
    accentText: "text-blue-400",
    accentTextDark: "text-blue-600",
    line: "bg-blue-500",
    ring: "ring-blue-500/30",
  },
  yellow: {
    accentText: "text-yellow-400",
    accentTextDark: "text-yellow-600",
    line: "bg-yellow-500",
    ring: "ring-yellow-500/30",
  },
  red: {
    accentText: "text-red-400",
    accentTextDark: "text-red-600",
    line: "bg-red-500",
    ring: "ring-red-500/30",
  },
};

const BG_COR_CLASSES: Record<string, { bg: string; isDark: boolean }> = {
  claro: { bg: "bg-gradient-to-b from-slate-50 to-white", isDark: false },
  cinza: { bg: "bg-gradient-to-b from-slate-100 to-slate-200", isDark: false },
  escuro: { bg: "bg-gradient-to-b from-slate-950 to-slate-900", isDark: true },
  azul_escuro: { bg: "bg-gradient-to-b from-slate-950 to-blue-950", isDark: true },
  verde_escuro: { bg: "bg-gradient-to-b from-slate-950 to-emerald-950", isDark: true },
};

function renderTitleWithHighlight(
  titulo: string,
  highlight: string | undefined,
  highlightClass: string
) {
  if (!highlight) return <span>{titulo}</span>;
  const match = findHighlightMatchRelaxed(titulo, highlight);
  if (!match) {
    return (
      <>
        {titulo} <span className={highlightClass}>{highlight}</span>
      </>
    );
  }
  const before = titulo.slice(0, match.index);
  const mid = titulo.slice(match.index, match.index + match.length);
  const after = titulo.slice(match.index + match.length);
  return (
    <>
      {before}
      <span className={highlightClass}>{mid}</span>
      {after}
    </>
  );
}

export function TimeSection({ data }: { data: Data }) {
  const titulo = getDataString(data, "titulo") || "Nosso Time";
  const tituloHighlight = getDataString(data, "titulo_highlight") || undefined;
  const subtitulo = getDataString(data, "subtitulo");

  const cor = getDataString(data, "cor") || "cyan";
  const bgTipo = getDataString(data, "bg_tipo") || "cor";
  const bgCor = getDataString(data, "bg_cor") || "claro";
  const bgImageUrl = getDataString(data, "bg_image_url");

  const members = ((data.items as TimeMember[]) ?? []).filter(
    (m) =>
      (m?.nome || "").trim() ||
      (m?.instagram || "").trim() ||
      (m?.funcao || "").trim() ||
      (m?.foto_url || "").trim()
  );

  if (!titulo && members.length === 0) return null;

  const colors = COLOR_CLASSES[cor] || COLOR_CLASSES.cyan;
  const bgConfig = BG_COR_CLASSES[bgCor] || BG_COR_CLASSES.claro;
  const isDark = bgTipo === "imagem" ? true : bgConfig.isDark;
  const accentText = isDark ? colors.accentText : colors.accentTextDark;

  const bgClasses = bgTipo === "imagem" && bgImageUrl ? "relative" : bgConfig.bg;

  return (
    <section className={`${bgClasses} px-6 py-16 md:py-24`}>
      {bgTipo === "imagem" && bgImageUrl && (
        <>
          <div className="absolute inset-0">
            <img src={bgImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-slate-950/80" />
        </>
      )}

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <h2
            className={`text-3xl md:text-4xl font-bold leading-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {renderTitleWithHighlight(titulo, tituloHighlight, accentText)}
          </h2>
          <div className={`mx-auto mt-4 h-1 w-20 rounded-full ${colors.line}`} />
          {subtitulo && (
            <p
              className={`mx-auto mt-6 max-w-2xl text-lg ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {subtitulo}
            </p>
          )}
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m, idx) => (
            <div
              key={idx}
              className={`group rounded-2xl border ${
                isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
              } p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ${colors.ring}`}
                >
                  {m.foto_url ? (
                    <img
                      src={m.foto_url}
                      alt={m.nome || `Membro ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center ${
                        isDark ? "bg-white/10" : "bg-slate-100"
                      }`}
                    >
                      <Users className={`h-6 w-6 ${accentText}`} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className={`truncate text-lg font-semibold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {m.nome || `Membro ${idx + 1}`}
                  </div>
                  <div
                    className={`truncate text-sm ${accentText} font-medium`}
                  >
                    {(m.instagram || "").trim()
                      ? (m.instagram || "").trim().startsWith("@")
                        ? (m.instagram || "").trim()
                        : `@${(m.instagram || "").trim()}`
                      : "@instagram"}
                  </div>
                </div>
              </div>

              <div
                className={`mt-6 h-px w-full ${
                  isDark ? "bg-white/10" : "bg-slate-200"
                }`}
              />

              <div className="mt-4 flex items-center justify-end">
                <span
                  className={`truncate pl-3 text-right text-sm font-semibold ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                  title={m.funcao || ""}
                >
                  {m.funcao || "Função"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

