"use client";

import type { ReactNode } from "react";
import { findHighlightMatchRelaxed, getDataString } from "./utils";

type Data = {
  titulo?: string;
  titulo_highlight?: string;
  video_url?: string;
  thumbnail_url?: string;
  cta_text?: string;
  cta_url?: string;
};

function embedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return url;
}

function renderTitleWithHighlight(
  titulo: string,
  highlight: string | undefined
): ReactNode {
  const match = findHighlightMatchRelaxed(titulo, highlight);
  if (match) {
    const { index, length } = match;
    const matchedText = titulo.slice(index, index + length);
    return (
      <>
        {titulo.slice(0, index)}
        <span className="text-cyan-400 font-semibold">
          {matchedText}
        </span>
        {titulo.slice(index + length)}
      </>
    );
  }
  if (highlight && highlight.trim()) {
    return (
      <>
        {titulo}
        {" "}
        <span className="text-cyan-400 font-semibold">
          {highlight.trim()}
        </span>
      </>
    );
  }
  return titulo;
}

export function VideoSection({ data }: { data: Data }) {
  const src = embedUrl(data.video_url ?? "");
  const titulo = (data.titulo ?? "") as string;
  const tituloHighlight = getDataString(data as Record<string, unknown>, "titulo_highlight") || undefined;
  if (!src && !titulo && !data.cta_text) return null;
  return (
    <section
      className="relative px-6 py-16 bg-slate-950 overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(rgba(34, 211, 238, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34, 211, 238, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }}
    >
      <div className="relative max-w-4xl mx-auto text-center">
        {titulo && (
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-white">
            {renderTitleWithHighlight(titulo, tituloHighlight || undefined)}
          </h2>
        )}
        {src && (
          <div className="rounded-xl overflow-hidden bg-black border border-cyan-500/30 shadow-[0_0_24px_rgba(34,211,238,0.15)] mb-10">
            <div className="aspect-video">
              <iframe
                src={src}
                title="Vídeo"
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        )}
        {data.cta_text && (
          <a
            href={data.cta_url || "#oferta"}
            data-cta="video"
            className="inline-flex items-center justify-center rounded-xl px-8 py-4 text-lg font-bold tracking-wide text-gray-900 uppercase bg-gradient-to-b from-cyan-400 via-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(34,211,238,0.4),0_4px_14px_rgba(0,0,0,0.25)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_28px_rgba(34,211,238,0.6),0_6px_20px_rgba(0,0,0,0.3)] hover:from-cyan-300 hover:via-cyan-400 hover:to-blue-500"
          >
            {data.cta_text}
          </a>
        )}
      </div>
    </section>
  );
}
