"use client";

import { findHighlightMatchRelaxed, getDataString } from "./utils";

type Data = { titulo?: string; titulo_highlight?: string; conteudo?: string };

function SectionTitle({
  titulo,
  highlightRaw,
}: {
  titulo: string;
  highlightRaw: string | undefined;
}) {
  const matchHighlight = findHighlightMatchRelaxed(titulo, highlightRaw);
  const hasHighlight = !!matchHighlight;
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold text-white">
        {hasHighlight && matchHighlight ? (
          <>
            {titulo.slice(0, matchHighlight.index)}
            <span className="text-cyan-400">
              {titulo.slice(matchHighlight.index, matchHighlight.index + matchHighlight.length)}
            </span>
            {titulo.slice(matchHighlight.index + matchHighlight.length)}
          </>
        ) : (
          titulo
        )}
      </h2>
      {(hasHighlight || highlightRaw) && (
        <div className="mt-2 w-24 h-0.5 bg-cyan-400/80 mx-auto rounded-full shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
      )}
      {highlightRaw && !matchHighlight && (
        <p className="mt-2 text-cyan-400 font-semibold text-xl">{highlightRaw}</p>
      )}
    </div>
  );
}

export function SobreProjetoSection({ data }: { data: Data }) {
  const titulo = (data.titulo ?? "") as string;
  const conteudo = (data.conteudo ?? "") as string;
  const highlightRaw = getDataString(data as Record<string, unknown>, "titulo_highlight") || undefined;
  if (!titulo && !conteudo) return null;

  return (
    <section
      className="relative px-6 py-16 overflow-hidden bg-slate-950"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="relative max-w-3xl mx-auto">
        {titulo && <SectionTitle titulo={titulo} highlightRaw={highlightRaw} />}
        {conteudo && (
          <div className="text-white/90 text-lg leading-relaxed whitespace-pre-line">
            {conteudo}
          </div>
        )}
      </div>
    </section>
  );
}
