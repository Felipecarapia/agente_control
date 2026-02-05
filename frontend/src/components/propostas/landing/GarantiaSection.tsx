"use client";

import { ShieldCheck, Check, Sparkles } from "lucide-react";
import { findHighlightMatchRelaxed, getDataString } from "./utils";

type Data = Record<string, unknown>;

const COLOR_CLASSES: Record<
  string,
  {
    accentText: string;
    accentTextDark: string;
    accentBg: string;
    accentBorder: string;
    line: string;
    glow: string;
  }
> = {
  green: {
    accentText: "text-green-400",
    accentTextDark: "text-green-600",
    accentBg: "bg-green-500/12",
    accentBorder: "border-green-500/30",
    line: "bg-green-500",
    glow: "shadow-[0_0_50px_rgba(34,197,94,0.12)]",
  },
  cyan: {
    accentText: "text-cyan-400",
    accentTextDark: "text-cyan-600",
    accentBg: "bg-cyan-500/12",
    accentBorder: "border-cyan-500/30",
    line: "bg-cyan-500",
    glow: "shadow-[0_0_50px_rgba(34,211,238,0.12)]",
  },
  orange: {
    accentText: "text-orange-400",
    accentTextDark: "text-orange-600",
    accentBg: "bg-orange-500/12",
    accentBorder: "border-orange-500/30",
    line: "bg-orange-500",
    glow: "shadow-[0_0_50px_rgba(249,115,22,0.12)]",
  },
  purple: {
    accentText: "text-purple-400",
    accentTextDark: "text-purple-600",
    accentBg: "bg-purple-500/12",
    accentBorder: "border-purple-500/30",
    line: "bg-purple-500",
    glow: "shadow-[0_0_50px_rgba(168,85,247,0.12)]",
  },
  blue: {
    accentText: "text-blue-400",
    accentTextDark: "text-blue-600",
    accentBg: "bg-blue-500/12",
    accentBorder: "border-blue-500/30",
    line: "bg-blue-500",
    glow: "shadow-[0_0_50px_rgba(59,130,246,0.12)]",
  },
  yellow: {
    accentText: "text-yellow-400",
    accentTextDark: "text-yellow-600",
    accentBg: "bg-yellow-500/12",
    accentBorder: "border-yellow-500/30",
    line: "bg-yellow-500",
    glow: "shadow-[0_0_50px_rgba(234,179,8,0.12)]",
  },
  red: {
    accentText: "text-red-400",
    accentTextDark: "text-red-600",
    accentBg: "bg-red-500/12",
    accentBorder: "border-red-500/30",
    line: "bg-red-500",
    glow: "shadow-[0_0_50px_rgba(239,68,68,0.12)]",
  },
};

const BG_COR_CLASSES: Record<string, { bg: string; isDark: boolean }> = {
  escuro: { bg: "bg-gradient-to-b from-slate-950 to-slate-900", isDark: true },
  azul_escuro: { bg: "bg-gradient-to-b from-slate-950 to-blue-950", isDark: true },
  verde_escuro: { bg: "bg-gradient-to-b from-slate-950 to-emerald-950", isDark: true },
  claro: { bg: "bg-gradient-to-b from-slate-50 to-white", isDark: false },
  cinza: { bg: "bg-gradient-to-b from-slate-100 to-slate-200", isDark: false },
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

export function GarantiaSection({ data }: { data: Data }) {
  const titulo = getDataString(data, "titulo") || "Garantia";
  const tituloHighlight = getDataString(data, "titulo_highlight") || undefined;
  const subtitulo = getDataString(data, "subtitulo");
  const prazoDiasRaw = getDataString(data, "prazo_dias");
  const prazoDias = Number(prazoDiasRaw || 0) || 0;
  const seloTitulo = getDataString(data, "selo_titulo") || "Garantia";
  const seloSubtitulo = getDataString(data, "selo_subtitulo") || "";
  const texto = getDataString(data, "texto");
  const itens = ((data.itens as string[]) ?? []).filter((s) => (s || "").trim());
  const ctaTexto = getDataString(data, "cta_texto");
  const ctaUrl = getDataString(data, "cta_url") || "#oferta";

  const cor = getDataString(data, "cor") || "green";
  const bgTipo = getDataString(data, "bg_tipo") || "cor";
  const bgCor = getDataString(data, "bg_cor") || "escuro";
  const bgImageUrl = getDataString(data, "bg_image_url");

  const colors = COLOR_CLASSES[cor] || COLOR_CLASSES.green;
  const bgConfig = BG_COR_CLASSES[bgCor] || BG_COR_CLASSES.escuro;
  const isDark = bgTipo === "imagem" ? true : bgConfig.isDark;

  const accentText = isDark ? colors.accentText : colors.accentTextDark;
  const bgClasses = bgTipo === "imagem" && bgImageUrl ? "relative" : bgConfig.bg;

  return (
    <section className={`${bgClasses} relative overflow-hidden px-6 py-16 md:py-24`}>
      {bgTipo === "imagem" && bgImageUrl && (
        <>
          <div className="absolute inset-0">
            <img src={bgImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-slate-950/80" />
        </>
      )}

      {/* brilhos decorativos */}
      <div
        className={`pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl ${colors.accentBg} ${colors.glow}`}
        aria-hidden
      />

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

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* selo */}
          <div className="lg:col-span-4">
            <div
              className={`relative h-full rounded-2xl border ${
                isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
              } p-8 overflow-hidden`}
            >
              <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full blur-2xl ${colors.accentBg}`} aria-hidden />

              <div className="flex items-center gap-3">
                <div
                  className={`h-12 w-12 rounded-xl border ${colors.accentBorder} ${colors.accentBg} flex items-center justify-center`}
                >
                  <ShieldCheck className={`h-6 w-6 ${accentText}`} />
                </div>
                <div className="min-w-0">
                  <div className={`text-sm uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {seloTitulo}
                  </div>
                  <div className={`truncate text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {seloSubtitulo || "Sem burocracia"}
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Prazo</div>
                <div className={`mt-2 flex items-end gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  <div className={`text-6xl font-extrabold leading-none ${accentText}`}>
                    {prazoDias > 0 ? prazoDias : "—"}
                  </div>
                  <div className="pb-1 text-lg font-semibold">dias</div>
                </div>
                <div className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  Para testar com tranquilidade e decidir com confiança.
                </div>
              </div>

              <div className="mt-10 flex items-center gap-2">
                <Sparkles className={`h-4 w-4 ${accentText}`} />
                <span className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  Reembolso integral dentro do prazo
                </span>
              </div>
            </div>
          </div>

          {/* conteúdo */}
          <div className="lg:col-span-8">
            <div
              className={`h-full rounded-2xl border ${
                isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
              } p-8 md:p-10`}
            >
              {texto && (
                <p className={`text-lg leading-relaxed ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {texto}
                </p>
              )}

              {itens.length > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {itens.map((item, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border ${
                        isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
                      } p-4`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 h-8 w-8 rounded-lg ${colors.accentBg} border ${colors.accentBorder} flex items-center justify-center`}>
                          <Check className={`h-4 w-4 ${accentText}`} />
                        </div>
                        <div className={`text-sm md:text-base ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                          {item}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ctaTexto && (
                <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
                  <a
                    href={ctaUrl}
                    data-cta="garantia"
                    className={`inline-flex items-center justify-center rounded-xl px-8 py-4 text-base md:text-lg font-bold tracking-wide uppercase ${
                      isDark ? "text-slate-950" : "text-white"
                    } ${colors.line} shadow-lg hover:opacity-95 transition`}
                  >
                    {ctaTexto}
                  </a>
                  <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Você decide com tranquilidade. Sem pressão.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

