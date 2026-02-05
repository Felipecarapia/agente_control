"use client";

import { findHighlightMatchRelaxed, getDataString } from "./utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Item = { titulo?: string; descricao?: string; image_url?: string };
type Data = { titulo?: string; titulo_highlight?: string; items?: Item[] };

export function ParaQuemSection({ data }: { data: Data }) {
  const items = data.items ?? [];
  if (items.length === 0 && !data.titulo) return null;

  const titulo = (data.titulo ?? "") as string;
  const highlightRaw = getDataString(data as Record<string, unknown>, "titulo_highlight") || undefined;
  const matchHighlight = findHighlightMatchRelaxed(titulo, highlightRaw);
  const hasHighlight = !!matchHighlight;

  return (
    <section
      className="relative px-6 py-16 overflow-hidden bg-slate-950"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="relative max-w-5xl mx-auto">
        {titulo && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              {hasHighlight && matchHighlight ? (
                <>
                  {titulo.slice(0, matchHighlight.index)}
                  <span className="text-cyan-400">{titulo.slice(matchHighlight.index, matchHighlight.index + matchHighlight.length)}</span>
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
        )}
        <ul className="grid gap-10 md:grid-cols-3 text-left list-none p-0 m-0">
          {items.map((item, i) => {
            const imgUrl = item.image_url
              ? item.image_url.startsWith("http")
                ? item.image_url
                : `${API_URL}${item.image_url}`
              : null;
            return (
              <li key={i} className="flex flex-col gap-3">
                {imgUrl && (
                  <img
                    src={imgUrl}
                    alt={item.titulo ?? ""}
                    className="block w-full max-w-full h-auto object-contain"
                  />
                )}
                {item.titulo && (
                  <h3 className="text-xl font-bold text-white">{item.titulo}</h3>
                )}
                {item.descricao && (
                  <p className="text-white/80 text-sm leading-relaxed">
                    {item.descricao}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
