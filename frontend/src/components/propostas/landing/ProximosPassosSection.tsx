"use client";

import {
  FileCheck,
  Rocket,
  Code,
  GraduationCap,
  CheckCircle,
  Settings,
  Users,
  Zap,
  ArrowRight,
} from "lucide-react";

interface Passo {
  numero: number;
  titulo: string;
  descricao: string;
  icone: string;
}

interface Data {
  titulo?: string;
  titulo_highlight?: string;
  subtitulo?: string;
  cor?: string;
  bg_tipo?: string;
  bg_cor?: string;
  bg_image_url?: string;
  passos?: Passo[];
}

const COLOR_CLASSES: Record<string, { text: string; bg: string; border: string; gradient: string }> = {
  cyan: {
    text: "text-cyan-400",
    bg: "bg-cyan-500",
    border: "border-cyan-500/30",
    gradient: "from-cyan-500/20 to-transparent",
  },
  green: {
    text: "text-green-400",
    bg: "bg-green-500",
    border: "border-green-500/30",
    gradient: "from-green-500/20 to-transparent",
  },
  blue: {
    text: "text-blue-400",
    bg: "bg-blue-500",
    border: "border-blue-500/30",
    gradient: "from-blue-500/20 to-transparent",
  },
  purple: {
    text: "text-purple-400",
    bg: "bg-purple-500",
    border: "border-purple-500/30",
    gradient: "from-purple-500/20 to-transparent",
  },
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-500",
    border: "border-orange-500/30",
    gradient: "from-orange-500/20 to-transparent",
  },
  pink: {
    text: "text-pink-400",
    bg: "bg-pink-500",
    border: "border-pink-500/30",
    gradient: "from-pink-500/20 to-transparent",
  },
};

const BG_CLASSES: Record<string, string> = {
  escuro: "bg-slate-900 text-white",
  claro: "bg-slate-50 text-slate-900",
  transparente: "bg-transparent text-white",
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "file-check": FileCheck,
  rocket: Rocket,
  code: Code,
  "graduation-cap": GraduationCap,
  "check-circle": CheckCircle,
  settings: Settings,
  users: Users,
  zap: Zap,
};

function SectionTitle({
  titulo,
  highlight,
  colorClass,
}: {
  titulo: string;
  highlight?: string;
  colorClass: string;
}) {
  if (!highlight) {
    return <span>{titulo}</span>;
  }
  const parts = titulo.split(new RegExp(`(${highlight})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className={colorClass}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function ProximosPassosSection({ data }: { data: Data }) {
  const {
    titulo = "Próximos Passos",
    titulo_highlight = "Passos",
    subtitulo = "Veja como é simples começar",
    cor = "cyan",
    bg_tipo = "cor",
    bg_cor = "escuro",
    bg_image_url = "",
    passos = [],
  } = data;

  const colorClasses = COLOR_CLASSES[cor] || COLOR_CLASSES.cyan;
  const bgClass = BG_CLASSES[bg_cor] || BG_CLASSES.escuro;
  const isDark = bg_cor === "escuro" || bg_cor === "transparente";

  const bgStyle =
    bg_tipo === "imagem" && bg_image_url
      ? {
          backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.9), rgba(15,23,42,0.95)), url(${bg_image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {};

  return (
    <section
      className={`py-20 md:py-28 ${bg_tipo === "imagem" && bg_image_url ? "text-white" : bgClass}`}
      style={bgStyle}
    >
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <SectionTitle titulo={titulo} highlight={titulo_highlight} colorClass={colorClasses.text} />
          </h2>
          {subtitulo && (
            <p className={`text-lg md:text-xl max-w-2xl mx-auto ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {subtitulo}
            </p>
          )}
        </div>

        {/* Timeline de Passos */}
        <div className="relative">
          {/* Linha conectora (desktop) */}
          <div className={`hidden md:block absolute top-20 left-0 right-0 h-1 ${colorClasses.bg} opacity-20`} />

          <div className="grid md:grid-cols-4 gap-8 md:gap-4">
            {passos.map((passo, index) => {
              const Icon = ICONS[passo.icone] || CheckCircle;
              const isLast = index === passos.length - 1;

              return (
                <div key={index} className="relative flex flex-col items-center text-center">
                  {/* Número e Ícone */}
                  <div
                    className={`relative z-10 w-16 h-16 md:w-20 md:h-20 rounded-full ${colorClasses.bg} flex items-center justify-center mb-6 shadow-lg shadow-${cor}-500/20`}
                  >
                    <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    <div
                      className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${isDark ? "bg-slate-900" : "bg-white"} flex items-center justify-center text-sm font-bold ${colorClasses.text} border-2 ${colorClasses.border}`}
                    >
                      {passo.numero}
                    </div>
                  </div>

                  {/* Seta para próximo (mobile) */}
                  {!isLast && (
                    <div className="md:hidden absolute -bottom-4 left-1/2 -translate-x-1/2">
                      <ArrowRight className={`w-5 h-5 rotate-90 ${colorClasses.text} opacity-50`} />
                    </div>
                  )}

                  {/* Conteúdo */}
                  <div className={`p-6 rounded-2xl ${isDark ? "bg-white/5" : "bg-white shadow-lg"} border ${colorClasses.border} w-full`}>
                    <h3 className={`text-lg md:text-xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                      {passo.titulo}
                    </h3>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      {passo.descricao}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
