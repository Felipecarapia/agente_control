"use client";

import {
  Award,
  CheckCircle,
  Headphones,
  Zap,
  Shield,
  Clock,
  Users,
  Star,
  Heart,
  Target,
  Rocket,
  ThumbsUp,
} from "lucide-react";

interface DiferencialItem {
  icone: string;
  titulo: string;
  subtitulo: string;
}

interface Data {
  titulo?: string;
  titulo_highlight?: string;
  subtitulo?: string;
  cor?: string;
  bg_tipo?: string;
  bg_cor?: string;
  bg_image_url?: string;
  items?: DiferencialItem[];
}

const COLOR_CLASSES: Record<string, { text: string; bg: string; bgLight: string; border: string }> = {
  cyan: {
    text: "text-cyan-500",
    bg: "bg-cyan-500",
    bgLight: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  green: {
    text: "text-green-500",
    bg: "bg-green-500",
    bgLight: "bg-green-500/10",
    border: "border-green-500/20",
  },
  blue: {
    text: "text-blue-500",
    bg: "bg-blue-500",
    bgLight: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  purple: {
    text: "text-purple-500",
    bg: "bg-purple-500",
    bgLight: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  orange: {
    text: "text-orange-500",
    bg: "bg-orange-500",
    bgLight: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  pink: {
    text: "text-pink-500",
    bg: "bg-pink-500",
    bgLight: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
};

const BG_CLASSES: Record<string, string> = {
  escuro: "bg-slate-900 text-white",
  claro: "bg-slate-50 text-slate-900",
  transparente: "bg-transparent text-white",
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  "check-circle": CheckCircle,
  headphones: Headphones,
  zap: Zap,
  shield: Shield,
  clock: Clock,
  users: Users,
  star: Star,
  heart: Heart,
  target: Target,
  rocket: Rocket,
  "thumbs-up": ThumbsUp,
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

export function DiferenciaisSection({ data }: { data: Data }) {
  const {
    titulo = "Por Que Nos Escolher?",
    titulo_highlight = "Escolher",
    subtitulo = "Conheça os diferenciais que fazem a diferença no seu projeto",
    cor = "cyan",
    bg_tipo = "cor",
    bg_cor = "claro",
    bg_image_url = "",
    items = [],
  } = data;

  const colorClasses = COLOR_CLASSES[cor] || COLOR_CLASSES.cyan;
  const bgClass = BG_CLASSES[bg_cor] || BG_CLASSES.claro;
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

        {/* Grid de Diferenciais */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => {
            const Icon = ICONS[item.icone] || Award;

            return (
              <div
                key={index}
                className={`group relative p-8 rounded-2xl text-center transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? "bg-white/5 hover:bg-white/10 border border-white/10"
                    : "bg-white hover:shadow-xl border border-slate-100"
                }`}
              >
                {/* Ícone */}
                <div
                  className={`w-16 h-16 mx-auto mb-6 rounded-2xl ${colorClasses.bgLight} ${colorClasses.border} border-2 flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <Icon className={`w-8 h-8 ${colorClasses.text}`} />
                </div>

                {/* Número/Título Principal */}
                <h3 className={`text-2xl md:text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                  {item.titulo}
                </h3>

                {/* Subtítulo */}
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  {item.subtitulo}
                </p>

                {/* Decoração de hover */}
                <div
                  className={`absolute inset-x-0 bottom-0 h-1 ${colorClasses.bg} rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
