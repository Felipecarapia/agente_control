"use client";

import { findHighlightMatchRelaxed, getDataString } from "./utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Item = { titulo?: string; descricao?: string; image_url?: string; cliente?: string };
type Data = { titulo?: string; titulo_highlight?: string; items?: Item[]; cor?: string };

// Classes de cor dinâmicas
const COLOR_CLASSES: Record<string, { text: string; border: string; line: string; glow: string }> = {
  cyan: {
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    line: "bg-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.6)]",
    glow: "shadow-[0_0_20px_rgba(34,211,238,0.06)]",
  },
  green: {
    text: "text-green-400",
    border: "border-green-500/30",
    line: "bg-green-400/80 shadow-[0_0_12px_rgba(74,222,128,0.6)]",
    glow: "shadow-[0_0_20px_rgba(74,222,128,0.06)]",
  },
  orange: {
    text: "text-orange-400",
    border: "border-orange-500/30",
    line: "bg-orange-400/80 shadow-[0_0_12px_rgba(251,146,60,0.6)]",
    glow: "shadow-[0_0_20px_rgba(251,146,60,0.06)]",
  },
  purple: {
    text: "text-purple-400",
    border: "border-purple-500/30",
    line: "bg-purple-400/80 shadow-[0_0_12px_rgba(192,132,252,0.6)]",
    glow: "shadow-[0_0_20px_rgba(192,132,252,0.06)]",
  },
  blue: {
    text: "text-blue-400",
    border: "border-blue-500/30",
    line: "bg-blue-400/80 shadow-[0_0_12px_rgba(96,165,250,0.6)]",
    glow: "shadow-[0_0_20px_rgba(96,165,250,0.06)]",
  },
};

function SectionTitle({
  titulo,
  highlightRaw,
  colorClasses,
}: {
  titulo: string;
  highlightRaw: string | undefined;
  colorClasses: typeof COLOR_CLASSES["cyan"];
}) {
  const matchHighlight = findHighlightMatchRelaxed(titulo, highlightRaw);
  const hasHighlight = !!matchHighlight;
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold text-white">
        {hasHighlight && matchHighlight ? (
          <>
            {titulo.slice(0, matchHighlight.index)}
            <span className={colorClasses.text}>
              {titulo.slice(matchHighlight.index, matchHighlight.index + matchHighlight.length)}
            </span>
            {titulo.slice(matchHighlight.index + matchHighlight.length)}
          </>
        ) : (
          titulo
        )}
      </h2>
      {(hasHighlight || highlightRaw) && (
        <div className={`mt-2 w-24 h-0.5 mx-auto rounded-full ${colorClasses.line}`} />
      )}
      {highlightRaw && !matchHighlight && (
        <p className={`mt-2 font-semibold text-xl ${colorClasses.text}`}>{highlightRaw}</p>
      )}
    </div>
  );
}

export function CasesSucessoSection({ data }: { data: Data }) {
  const items = data.items ?? [];
  const titulo = (data.titulo ?? "") as string;
  const highlightRaw = getDataString(data as Record<string, unknown>, "titulo_highlight") || undefined;
  const cor = data.cor ?? "cyan";
  const colorClasses = COLOR_CLASSES[cor] ?? COLOR_CLASSES.cyan;
  
  if (items.length === 0 && !titulo) return null;

  return (
    <section
      className="relative px-6 py-16 overflow-hidden bg-slate-950"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="relative max-w-5xl mx-auto">
        {titulo && <SectionTitle titulo={titulo} highlightRaw={highlightRaw} colorClasses={colorClasses} />}
        <ul className="grid gap-8 md:grid-cols-2 list-none p-0 m-0">
          {items.map((item, i) => {
            const imgUrl = item.image_url
              ? item.image_url.startsWith("http")
                ? item.image_url
                : `${API_URL}${item.image_url}`
              : null;
            return (
              <li
                key={i}
                className={`rounded-xl border bg-slate-900/60 overflow-hidden ${colorClasses.border} ${colorClasses.glow}`}
              >
                {imgUrl && (
                  <div className="aspect-video bg-slate-800">
                    <img
                      src={imgUrl}
                      alt={item.titulo ?? ""}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  {item.cliente && (
                    <p className={`font-semibold text-sm mb-2 ${colorClasses.text}`}>{item.cliente}</p>
                  )}
                  {item.titulo && (
                    <h3 className="text-xl font-bold text-white mb-2">{item.titulo}</h3>
                  )}
                  {item.descricao && (
                    <p className="text-white/80 text-sm leading-relaxed">{item.descricao}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
