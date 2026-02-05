"use client";

import type { ReactNode } from "react";
import { findHighlightMatchRelaxed, getDataString } from "./utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Data = {
  logo_url?: string;
  headline?: string;
  headline_highlight?: string;
  subheadline?: string;
  subheadline_highlight?: string;
  cta_text?: string;
  cta_url?: string;
  background_image_url?: string;
  cor_texto?: string;
  cor_destaque?: string;
};

const HERO_TEXT_CLASSES: Record<
  string,
  { headline: string; subheadline: string; container: string }
> = {
  white: {
    headline: "text-white",
    subheadline: "text-white/90",
    container: "text-white",
  },
  slate: {
    headline: "text-slate-900",
    subheadline: "text-slate-700",
    container: "text-slate-900",
  },
  light: {
    headline: "text-slate-100",
    subheadline: "text-slate-200",
    container: "text-slate-100",
  },
};

const HERO_HIGHLIGHT_CLASSES: Record<string, string> = {
  cyan: "text-cyan-400",
  green: "text-green-400",
  orange: "text-orange-400",
  purple: "text-purple-400",
  blue: "text-blue-400",
  yellow: "text-yellow-400",
  red: "text-red-400",
};

function renderWithHighlight(
  text: string,
  highlight: string | undefined,
  highlightClass: string
): ReactNode {
  const match = findHighlightMatchRelaxed(text, highlight);
  if (match) {
    const { index, length } = match;
    const matchedText = text.slice(index, index + length);
    return (
      <>
        {text.slice(0, index)}
        <span className={highlightClass}>{matchedText}</span>
        {text.slice(index + length)}
      </>
    );
  }
  if (highlight && highlight.trim()) {
    return (
      <>
        {text}
        {" "}
        <span className={highlightClass}>{highlight.trim()}</span>
      </>
    );
  }
  return text;
}

export function HeroSection({ data }: { data: Data }) {
  const bgUrl = data.background_image_url
    ? (data.background_image_url.startsWith("http")
        ? data.background_image_url
        : `${API_URL}${data.background_image_url}`)
    : null;
  const logoUrl = data.logo_url
    ? (data.logo_url.startsWith("http") ? data.logo_url : `${API_URL}${data.logo_url}`)
    : null;
  const textKey = data.cor_texto || "white";
  const accentKey = data.cor_destaque || "cyan";
  const text = HERO_TEXT_CLASSES[textKey] || HERO_TEXT_CLASSES.white;
  const accent = HERO_HIGHLIGHT_CLASSES[accentKey] || HERO_HIGHLIGHT_CLASSES.cyan;
  const highlightClass = `${accent} font-semibold`;
  const headlineHighlight = getDataString(data as Record<string, unknown>, "headline_highlight") || data.headline_highlight;
  const subheadlineHighlight = getDataString(data as Record<string, unknown>, "subheadline_highlight") || data.subheadline_highlight;
  return (
    <section
      className="relative min-h-[70vh] flex flex-col justify-center py-20 pl-12 pr-6 md:pl-20 md:pr-12 lg:pl-28 lg:pr-16"
      style={
        bgUrl
          ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { backgroundColor: "hsl(var(--primary) / 0.08)" }
      }
    >
      <div className={`relative z-10 max-w-2xl space-y-6 text-left ${text.container}`}>
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            className="h-14 md:h-16 w-auto object-contain object-left"
          />
        )}
        {data.headline && (
          <h1 className={`text-4xl md:text-6xl font-bold tracking-tight ${text.headline}`}>
            {renderWithHighlight(
              data.headline,
              headlineHighlight,
              highlightClass
            )}
          </h1>
        )}
        {data.subheadline && (
          <p className={`text-xl md:text-2xl ${text.subheadline}`}>
            {renderWithHighlight(
              data.subheadline,
              subheadlineHighlight,
              highlightClass
            )}
          </p>
        )}
        {data.cta_text && (
          <a
            href={data.cta_url || "#oferta"}
            data-cta="hero"
            className="inline-flex items-center justify-center rounded-xl px-8 py-4 text-lg font-bold tracking-wide text-gray-900 uppercase bg-gradient-to-b from-cyan-400 via-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(34,211,238,0.4),0_4px_14px_rgba(0,0,0,0.25)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_28px_rgba(34,211,238,0.6),0_6px_20px_rgba(0,0,0,0.3)] hover:from-cyan-300 hover:via-cyan-400 hover:to-blue-500"
          >
            {data.cta_text}
          </a>
        )}
      </div>
    </section>
  );
}
