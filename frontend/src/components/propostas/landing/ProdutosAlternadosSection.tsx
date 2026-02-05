"use client";

import { Check, Package } from "lucide-react";
import { getDataString, findHighlightMatchRelaxed } from "./utils";

type Props = {
  data: Record<string, unknown>;
};

type ProdutoItem = {
  titulo?: string;
  descricao?: string;
  image_url?: string;
  features?: string[];
};

// Mapeamento de cores para classes Tailwind (tema claro)
const COLOR_CLASSES_LIGHT: Record<string, {
  text: string;
  border: string;
  line: string;
  check: string;
  checkBg: string;
  titleText: string;
  descText: string;
  featureText: string;
}> = {
  cyan: {
    text: "text-cyan-600",
    border: "border-cyan-500/30",
    line: "bg-cyan-500",
    check: "text-cyan-600",
    checkBg: "bg-cyan-500/20",
    titleText: "text-slate-900",
    descText: "text-slate-600",
    featureText: "text-slate-700",
  },
  green: {
    text: "text-green-600",
    border: "border-green-500/30",
    line: "bg-green-500",
    check: "text-green-600",
    checkBg: "bg-green-500/20",
    titleText: "text-slate-900",
    descText: "text-slate-600",
    featureText: "text-slate-700",
  },
  orange: {
    text: "text-orange-600",
    border: "border-orange-500/30",
    line: "bg-orange-500",
    check: "text-orange-600",
    checkBg: "bg-orange-500/20",
    titleText: "text-slate-900",
    descText: "text-slate-600",
    featureText: "text-slate-700",
  },
  purple: {
    text: "text-purple-600",
    border: "border-purple-500/30",
    line: "bg-purple-500",
    check: "text-purple-600",
    checkBg: "bg-purple-500/20",
    titleText: "text-slate-900",
    descText: "text-slate-600",
    featureText: "text-slate-700",
  },
  blue: {
    text: "text-blue-600",
    border: "border-blue-500/30",
    line: "bg-blue-500",
    check: "text-blue-600",
    checkBg: "bg-blue-500/20",
    titleText: "text-slate-900",
    descText: "text-slate-600",
    featureText: "text-slate-700",
  },
};

// Mapeamento de cores para classes Tailwind (tema escuro)
const COLOR_CLASSES_DARK: Record<string, {
  text: string;
  border: string;
  line: string;
  check: string;
  checkBg: string;
  titleText: string;
  descText: string;
  featureText: string;
}> = {
  cyan: {
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    line: "bg-cyan-500",
    check: "text-cyan-400",
    checkBg: "bg-cyan-500/20",
    titleText: "text-white",
    descText: "text-slate-300",
    featureText: "text-slate-200",
  },
  green: {
    text: "text-green-400",
    border: "border-green-500/30",
    line: "bg-green-500",
    check: "text-green-400",
    checkBg: "bg-green-500/20",
    titleText: "text-white",
    descText: "text-slate-300",
    featureText: "text-slate-200",
  },
  orange: {
    text: "text-orange-400",
    border: "border-orange-500/30",
    line: "bg-orange-500",
    check: "text-orange-400",
    checkBg: "bg-orange-500/20",
    titleText: "text-white",
    descText: "text-slate-300",
    featureText: "text-slate-200",
  },
  purple: {
    text: "text-purple-400",
    border: "border-purple-500/30",
    line: "bg-purple-500",
    check: "text-purple-400",
    checkBg: "bg-purple-500/20",
    titleText: "text-white",
    descText: "text-slate-300",
    featureText: "text-slate-200",
  },
  blue: {
    text: "text-blue-400",
    border: "border-blue-500/30",
    line: "bg-blue-500",
    check: "text-blue-400",
    checkBg: "bg-blue-500/20",
    titleText: "text-white",
    descText: "text-slate-300",
    featureText: "text-slate-200",
  },
};

// Backgrounds de cor
const BG_COR_CLASSES: Record<string, { bg: string; isDark: boolean }> = {
  claro: { bg: "bg-gradient-to-b from-slate-50 to-white", isDark: false },
  escuro: { bg: "bg-gradient-to-b from-slate-900 to-slate-800", isDark: true },
  cinza: { bg: "bg-gradient-to-b from-slate-100 to-slate-200", isDark: false },
  azul_escuro: { bg: "bg-gradient-to-b from-slate-900 to-blue-950", isDark: true },
  verde_escuro: { bg: "bg-gradient-to-b from-slate-900 to-emerald-950", isDark: true },
};

export function ProdutosAlternadosSection({ data }: Props) {
  const titulo = getDataString(data, "titulo") || "Conheça Nossa Solução";
  const tituloHighlight = getDataString(data, "titulo_highlight");
  const subtitulo = getDataString(data, "subtitulo");
  const cor = getDataString(data, "cor") || "cyan";
  const bgTipo = getDataString(data, "bg_tipo") || "cor";
  const bgCor = getDataString(data, "bg_cor") || "claro";
  const bgImageUrl = getDataString(data, "bg_image_url");
  const items = (data.items as ProdutoItem[]) ?? [];

  // Determina se é tema escuro
  const bgConfig = BG_COR_CLASSES[bgCor] || BG_COR_CLASSES.claro;
  const isDark = bgTipo === "imagem" ? true : bgConfig.isDark;

  // Seleciona paleta de cores baseado no tema
  const colorPalette = isDark ? COLOR_CLASSES_DARK : COLOR_CLASSES_LIGHT;
  const colors = colorPalette[cor] || colorPalette.cyan;

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

  // Determina classes de background
  const bgClasses = bgTipo === "imagem" && bgImageUrl
    ? "relative"
    : bgConfig.bg;

  return (
    <section className={`${bgClasses} px-6 py-16 md:py-24`}>
      {/* Background de imagem */}
      {bgTipo === "imagem" && bgImageUrl && (
        <>
          <div className="absolute inset-0">
            <img
              src={bgImageUrl}
              alt="Background"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-slate-900/80" />
        </>
      )}

      <div className="relative mx-auto max-w-6xl">
        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <h2 className={`text-3xl md:text-4xl font-bold leading-tight ${colors.titleText}`}>
            {renderTitulo()}
          </h2>
        </div>

        {/* Linha separadora */}
        <div className={`mx-auto mb-6 h-1 w-24 rounded-full ${colors.line}`} />

        {/* Subtítulo */}
        {subtitulo && (
          <p className={`text-center text-lg mb-16 max-w-2xl mx-auto ${colors.descText}`}>
            {subtitulo}
          </p>
        )}

        {/* Lista de produtos alternados */}
        <div className="space-y-16 md:space-y-24">
          {items.map((item, idx) => {
            const isEven = idx % 2 === 0;
            const features = item.features ?? [];

            return (
              <div
                key={idx}
                className={`flex flex-col gap-8 md:gap-12 ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                } items-center`}
              >
                {/* Imagem */}
                <div className="w-full md:w-1/2">
                  <div className={`relative aspect-video rounded-2xl overflow-hidden border-2 ${colors.border} shadow-xl ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.titulo || `Produto ${idx + 1}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className={`absolute inset-0 flex flex-col items-center justify-center ${isDark ? "bg-gradient-to-br from-slate-700 to-slate-800" : "bg-gradient-to-br from-slate-200 to-slate-300"}`}>
                        <Package className={`h-16 w-16 ${colors.text} opacity-50`} />
                        <span className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Imagem do produto</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="w-full md:w-1/2">
                  <h3 className={`text-2xl md:text-3xl font-bold mb-4 ${colors.titleText}`}>
                    {item.titulo || `Produto ${idx + 1}`}
                  </h3>
                  
                  <p className={`text-lg leading-relaxed mb-6 ${colors.descText}`}>
                    {item.descricao || "Descrição do produto ou solução."}
                  </p>

                  {/* Lista de features */}
                  {features.length > 0 && (
                    <ul className="space-y-3">
                      {features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-3">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.checkBg}`}>
                            <Check className={`h-4 w-4 ${colors.check}`} />
                          </span>
                          <span className={`font-medium ${colors.featureText}`}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
