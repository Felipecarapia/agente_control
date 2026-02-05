"use client";

import { findHighlightMatchRelaxed, getDataString } from "./utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Item = { logo_url?: string; nome?: string };
type Data = { titulo?: string; titulo_highlight?: string; items?: Item[]; cor?: string };

// Classes de cor dinâmicas
const COLOR_CLASSES: Record<string, { text: string; line: string }> = {
  cyan: {
    text: "text-cyan-400",
    line: "bg-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.6)]",
  },
  green: {
    text: "text-green-400",
    line: "bg-green-400/80 shadow-[0_0_12px_rgba(74,222,128,0.6)]",
  },
  orange: {
    text: "text-orange-400",
    line: "bg-orange-400/80 shadow-[0_0_12px_rgba(251,146,60,0.6)]",
  },
  purple: {
    text: "text-purple-400",
    line: "bg-purple-400/80 shadow-[0_0_12px_rgba(192,132,252,0.6)]",
  },
  blue: {
    text: "text-blue-400",
    line: "bg-blue-400/80 shadow-[0_0_12px_rgba(96,165,250,0.6)]",
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

export function NossosClientesSection({ data }: { data: Data }) {
  const items = data.items ?? [];
  const titulo = (data.titulo ?? "") as string;
  const highlightRaw = getDataString(data as Record<string, unknown>, "titulo_highlight") || undefined;
  const cor = data.cor ?? "cyan";
  const colorClasses = COLOR_CLASSES[cor] ?? COLOR_CLASSES.cyan;
  
  if (items.length === 0 && !titulo) return null;

  const logos = items
    .map((item) => {
      const url = item.logo_url
        ? item.logo_url.startsWith("http")
          ? item.logo_url
          : `${API_URL}${item.logo_url}`
        : null;
      return url ? { url, nome: item.nome ?? "" } : null;
    })
    .filter((x): x is { url: string; nome: string } => x !== null);

  if (!titulo && logos.length === 0) return null;

  return (
    <section
      className="relative px-6 py-16 overflow-hidden bg-slate-950"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="relative max-w-6xl mx-auto">
        {titulo && <SectionTitle titulo={titulo} highlightRaw={highlightRaw} colorClasses={colorClasses} />}
        {logos.length > 0 && (
        <div className="overflow-hidden">
          <div className="flex gap-12 items-center w-max animate-scroll-left">
            {[...logos, ...logos].map((logo, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex items-center justify-center grayscale hover:grayscale-0 opacity-80 hover:opacity-100 transition-all duration-300"
                style={{ minWidth: "140px", maxWidth: "180px", height: "64px" }}
              >
                <img
                  src={logo.url}
                  alt={logo.nome || `Cliente ${i + 1}`}
                  className="max-h-full w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
