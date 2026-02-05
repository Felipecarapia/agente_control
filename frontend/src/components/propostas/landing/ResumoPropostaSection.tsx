"use client";

import { Check, Clock, CreditCard, ArrowRight, Sparkles } from "lucide-react";

interface Data {
  titulo?: string;
  titulo_highlight?: string;
  valor_total?: string;
  parcelas?: string;
  prazo_entrega?: string;
  cor?: string;
  bg_tipo?: string;
  bg_cor?: string;
  bg_image_url?: string;
  itens_inclusos?: string[];
  cta_texto?: string;
  cta_url?: string;
}

const COLOR_CLASSES: Record<string, { text: string; bg: string; border: string; ring: string }> = {
  cyan: {
    text: "text-cyan-400",
    bg: "bg-cyan-500",
    border: "border-cyan-500/30",
    ring: "ring-cyan-500/20",
  },
  green: {
    text: "text-green-400",
    bg: "bg-green-500",
    border: "border-green-500/30",
    ring: "ring-green-500/20",
  },
  blue: {
    text: "text-blue-400",
    bg: "bg-blue-500",
    border: "border-blue-500/30",
    ring: "ring-blue-500/20",
  },
  purple: {
    text: "text-purple-400",
    bg: "bg-purple-500",
    border: "border-purple-500/30",
    ring: "ring-purple-500/20",
  },
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-500",
    border: "border-orange-500/30",
    ring: "ring-orange-500/20",
  },
  pink: {
    text: "text-pink-400",
    bg: "bg-pink-500",
    border: "border-pink-500/30",
    ring: "ring-pink-500/20",
  },
};

const BG_CLASSES: Record<string, string> = {
  escuro: "bg-slate-900 text-white",
  claro: "bg-slate-50 text-slate-900",
  transparente: "bg-transparent text-white",
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

export function ResumoPropostaSection({ data }: { data: Data }) {
  const {
    titulo = "Resumo da Proposta",
    titulo_highlight = "Proposta",
    valor_total = "R$ 15.000",
    parcelas = "",
    prazo_entrega = "30 dias",
    cor = "cyan",
    bg_tipo = "cor",
    bg_cor = "escuro",
    bg_image_url = "",
    itens_inclusos = [],
    cta_texto = "Aprovar Proposta",
    cta_url = "#contato",
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
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <SectionTitle titulo={titulo} highlight={titulo_highlight} colorClass={colorClasses.text} />
          </h2>
        </div>

        {/* Card Principal */}
        <div
          className={`relative rounded-3xl overflow-hidden ${isDark ? "bg-white/5 backdrop-blur-sm" : "bg-white shadow-2xl"} border-2 ${colorClasses.border} ring-8 ${colorClasses.ring}`}
        >
          {/* Badge de Destaque */}
          <div className={`absolute top-0 right-0 ${colorClasses.bg} px-6 py-2 rounded-bl-2xl`}>
            <div className="flex items-center gap-2 text-white text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Proposta Exclusiva
            </div>
          </div>

          <div className="p-8 md:p-12">
            {/* Valor e Prazo */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10 pb-10 border-b border-white/10">
              {/* Investimento - Foco no Parcelado */}
              <div className="text-center md:text-left flex-1">
                <div className={`flex items-center justify-center md:justify-start gap-2 text-sm font-medium ${colorClasses.text} mb-3`}>
                  <CreditCard className="w-4 h-4" />
                  Investimento
                </div>
                {/* Valor Parcelado - Destaque Principal */}
                {parcelas && (
                  <div className={`text-4xl md:text-5xl lg:text-6xl font-bold ${colorClasses.text} mb-3`}>
                    {parcelas}
                  </div>
                )}
                {/* Valor à Vista - Menor */}
                {valor_total && (
                  <div className={`text-base ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    ou <span className="font-semibold">{valor_total}</span> à vista
                  </div>
                )}
              </div>

              {/* Divisor */}
              <div className={`hidden md:block w-px h-24 ${isDark ? "bg-white/10" : "bg-slate-200"}`} />

              {/* Prazo */}
              <div className="text-center md:text-left flex-1">
                <div className={`flex items-center justify-center md:justify-start gap-2 text-sm font-medium ${colorClasses.text} mb-3`}>
                  <Clock className="w-4 h-4" />
                  Prazo de Entrega
                </div>
                <div className={`text-4xl md:text-5xl lg:text-6xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {prazo_entrega}
                </div>
                <div className={`text-base mt-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  a partir da aprovação
                </div>
              </div>
            </div>

            {/* O que está incluso */}
            {itens_inclusos.length > 0 && (
              <div className="mb-10">
                <h3 className={`text-lg font-semibold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
                  O que está incluso:
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {itens_inclusos.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`shrink-0 w-6 h-6 rounded-full ${colorClasses.bg} flex items-center justify-center`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {cta_texto && (
              <div className="text-center">
                <a
                  href={cta_url || "#"}
                  data-cta="resumo-proposta"
                  className={`inline-flex items-center gap-3 px-10 py-5 ${colorClasses.bg} text-white text-lg font-semibold rounded-xl shadow-lg hover:opacity-90 transition-all transform hover:scale-105`}
                >
                  {cta_texto}
                  <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
