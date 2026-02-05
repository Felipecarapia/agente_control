"use client";

import { useState, useEffect, useRef } from "react";
import { findHighlightMatchRelaxed, getDataString } from "./utils";

type Item = { pergunta?: string; resposta?: string };
type Data = { titulo?: string; titulo_highlight?: string; items?: Item[] };

interface FAQSectionProps {
  data: Data;
  onFAQOpen?: (questionId: string, questionText: string) => void;
  onFAQClose?: (questionId: string) => void;
}

export function FAQSection({ data, onFAQOpen, onFAQClose }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const prevOpenIndex = useRef<number | null>(null);
  const items = data.items ?? [];
  
  // Track FAQ open/close
  useEffect(() => {
    const prevIdx = prevOpenIndex.current;
    
    // Se fechou uma pergunta
    if (prevIdx !== null && prevIdx !== openIndex) {
      onFAQClose?.(`faq-${prevIdx}`);
    }
    
    // Se abriu uma pergunta
    if (openIndex !== null && openIndex !== prevIdx) {
      const question = items[openIndex]?.pergunta || "";
      onFAQOpen?.(`faq-${openIndex}`, question);
    }
    
    prevOpenIndex.current = openIndex;
  }, [openIndex, items, onFAQOpen, onFAQClose]);
  
  if (items.length === 0 && !data.titulo) return null;

  const titulo = (data.titulo ?? "") as string;
  const highlightRaw = getDataString(data as Record<string, unknown>, "titulo_highlight") || undefined;
  const matchHighlight = findHighlightMatchRelaxed(titulo, highlightRaw);
  const hasHighlight = !!matchHighlight;

  return (
    <section
      className="relative px-6 py-16 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at center, rgba(15,23,42,0.98) 0%, rgba(2,6,23,1) 100%)",
      }}
    >
      <div className="relative max-w-2xl mx-auto">
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
            {highlightRaw && !matchHighlight && (
              <p className="mt-2 text-cyan-400 font-semibold text-xl">{highlightRaw}</p>
            )}
          </div>
        )}
        <div className="space-y-4">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                id={`faq-${i}`}
                className="rounded-xl border border-cyan-500/50 bg-slate-900/80 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.08)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-800/50 transition-colors"
                >
                  <span
                    className={`flex-shrink-0 text-white transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                  {item.pergunta && (
                    <span className="font-semibold text-white text-base flex-1">{item.pergunta}</span>
                  )}
                </button>
                {isOpen && item.resposta && (
                  <div className="pb-5 pl-14 pr-5">
                    <p className="text-white/90 text-sm leading-relaxed">{item.resposta}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
