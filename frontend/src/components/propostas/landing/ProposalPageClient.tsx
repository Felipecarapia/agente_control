"use client";

import { useRef, useEffect } from "react";
import { useProposalTracker } from "@/lib/proposal-tracker";
import { LandingSectionRenderer } from "@/components/propostas/landing";
import type { LandingSection } from "@/components/propostas/landing-section-types";

interface ProposalPageClientProps {
  slug: string;
  sections: LandingSection[];
}

export function ProposalPageClient({ slug, sections }: ProposalPageClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Inicializar o tracker
  const tracker = useProposalTracker(slug, { scrollContainer: containerRef });
  
  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-x-hidden overflow-y-auto bg-background text-foreground"
    >
      <main>
        {sections.length === 0 ? (
          <div className="px-6 py-20 text-center text-muted-foreground">
            <p className="text-xl">Esta proposta ainda não tem conteúdo na página.</p>
            <p className="mt-2 text-sm">O vendedor pode personalizar a landing no CRM.</p>
          </div>
        ) : (
          sections.map((section) => (
            <div
              key={section.id}
              data-section-id={section.id}
              data-section-type={section.type}
            >
              <LandingSectionRenderer
                section={section}
                onFAQOpen={tracker.trackFAQOpen}
                onFAQClose={tracker.trackFAQClose}
              />
            </div>
          ))
        )}
      </main>
      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        Proposta gerada pelo Sistemaxi CRM
      </footer>
    </div>
  );
}
