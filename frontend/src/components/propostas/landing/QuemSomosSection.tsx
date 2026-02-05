"use client";

import { Award, Users, Calendar, TrendingUp } from "lucide-react";
import { getDataString, findHighlightMatchRelaxed } from "./utils";

type Badge = {
  valor?: string;
  label?: string;
  icone?: string;
};

type Data = Record<string, unknown>;

// Mapeamento de cores
const COLOR_CLASSES: Record<string, {
  text: string;
  textDark: string;
  line: string;
  badge: string;
  badgeBorder: string;
}> = {
  cyan: {
    text: "text-cyan-400",
    textDark: "text-cyan-600",
    line: "bg-cyan-500",
    badge: "bg-cyan-500/10",
    badgeBorder: "border-cyan-500/30",
  },
  green: {
    text: "text-green-400",
    textDark: "text-green-600",
    line: "bg-green-500",
    badge: "bg-green-500/10",
    badgeBorder: "border-green-500/30",
  },
  orange: {
    text: "text-orange-400",
    textDark: "text-orange-600",
    line: "bg-orange-500",
    badge: "bg-orange-500/10",
    badgeBorder: "border-orange-500/30",
  },
  purple: {
    text: "text-purple-400",
    textDark: "text-purple-600",
    line: "bg-purple-500",
    badge: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
  },
  blue: {
    text: "text-blue-400",
    textDark: "text-blue-600",
    line: "bg-blue-500",
    badge: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30",
  },
};

// Backgrounds
const BG_CLASSES: Record<string, { bg: string; isDark: boolean }> = {
  escuro: { bg: "bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800", isDark: true },
  azul_escuro: { bg: "bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900", isDark: true },
  claro: { bg: "bg-gradient-to-br from-slate-50 to-white", isDark: false },
  cinza: { bg: "bg-gradient-to-br from-slate-100 to-slate-200", isDark: false },
};

// Ícones para badges
const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  users: Users,
  calendar: Calendar,
  trending: TrendingUp,
};

export function QuemSomosSection({ data }: { data: Data }) {
  const titulo = getDataString(data, "titulo") || "";
  const tituloHighlight = getDataString(data, "titulo_highlight");
  const conteudo = getDataString(data, "conteudo") || "";
  const logoUrl = getDataString(data, "logo_url");
  const imageUrl = getDataString(data, "image_url");
  const bgImageUrl = getDataString(data, "background_image_url");
  const cor = getDataString(data, "cor") || "cyan";
  const bgCor = getDataString(data, "bg_cor") || "escuro";
  const badges = (data.badges as Badge[]) ?? [];

  const colors = COLOR_CLASSES[cor] || COLOR_CLASSES.cyan;
  const bgConfig = BG_CLASSES[bgCor] || BG_CLASSES.escuro;
  const isDark = bgImageUrl ? true : bgConfig.isDark;

  if (!titulo && !conteudo && !imageUrl) return null;

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
          <span className={isDark ? colors.text : colors.textDark}>{highlighted}</span>
          {after}
        </>
      );
    }
    return (
      <>
        {titulo} <span className={isDark ? colors.text : colors.textDark}>{tituloHighlight}</span>
      </>
    );
  };

  return (
    <section className={`relative overflow-hidden ${bgImageUrl ? "" : bgConfig.bg}`}>
      {/* Background de imagem */}
      {bgImageUrl && (
        <>
          <div className="absolute inset-0">
            <img src={bgImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-slate-900/85" />
        </>
      )}

      <div className="relative px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          {/* Layout com imagem lateral */}
          <div className={`flex flex-col ${imageUrl ? "lg:flex-row lg:items-center lg:gap-16" : ""}`}>
            
            {/* Conteúdo */}
            <div className={`${imageUrl ? "lg:w-1/2" : "max-w-3xl mx-auto text-center"}`}>
              {/* Logo */}
              {logoUrl && (
                <div className={`mb-8 ${imageUrl ? "" : "flex justify-center"}`}>
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-16 md:h-20 w-auto object-contain"
                  />
                </div>
              )}

              {/* Título */}
              {titulo && (
                <div className={`mb-4 ${imageUrl ? "" : "text-center"}`}>
                  <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    {renderTitulo()}
                  </h2>
                </div>
              )}

              {/* Linha separadora */}
              <div className={`h-1 w-20 rounded-full mb-8 ${colors.line} ${imageUrl ? "" : "mx-auto"}`} />

              {/* Conteúdo de texto */}
              {conteudo && (
                <div className={`text-lg leading-relaxed whitespace-pre-line mb-8 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {conteudo}
                </div>
              )}

              {/* Badges de números/conquistas */}
              {badges.length > 0 && (
                <div className={`grid grid-cols-2 ${badges.length >= 4 ? "md:grid-cols-4" : badges.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4 mt-8`}>
                  {badges.map((badge, idx) => {
                    const IconComponent = BADGE_ICONS[badge.icone || "award"] || Award;
                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 text-center transition-all hover:scale-105 ${colors.badge} ${colors.badgeBorder}`}
                      >
                        <IconComponent className={`h-6 w-6 mx-auto mb-2 ${isDark ? colors.text : colors.textDark}`} />
                        <div className={`text-2xl md:text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {badge.valor || "0"}
                        </div>
                        <div className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {badge.label || "Label"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Imagem lateral */}
            {imageUrl && (
              <div className="lg:w-1/2 mt-12 lg:mt-0">
                <div className={`relative rounded-2xl overflow-hidden border-2 ${colors.badgeBorder} shadow-2xl`}>
                  <img
                    src={imageUrl}
                    alt="Quem somos"
                    className="w-full h-auto object-cover aspect-[4/3]"
                  />
                  {/* Overlay decorativo */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent`} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
