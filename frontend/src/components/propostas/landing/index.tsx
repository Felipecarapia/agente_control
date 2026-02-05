"use client";

import type { LandingSection } from "../landing-section-types";
import { HeroSection } from "./HeroSection";
import { BeneficiosSection } from "./BeneficiosSection";
import { OfertaSection } from "./OfertaSection";
import { DepoimentosSection } from "./DepoimentosSection";
import { FAQSection } from "./FAQSection";
import { CTASection } from "./CTASection";
import { VideoSection } from "./VideoSection";
import { ParaQuemSection } from "./ParaQuemSection";
import { QuemSomosSection } from "./QuemSomosSection";
import { SobreProjetoSection } from "./SobreProjetoSection";
import { ServicosValoresSection } from "./ServicosValoresSection";
import { NossosClientesSection } from "./NossosClientesSection";
import { CasesSucessoSection } from "./CasesSucessoSection";
import { DoresClienteSection } from "./DoresClienteSection";
import { ProdutosAlternadosSection } from "./ProdutosAlternadosSection";
import { TimeSection } from "./TimeSection";
import { GarantiaSection } from "./GarantiaSection";
import { ProximosPassosSection } from "./ProximosPassosSection";
import { ResumoPropostaSection } from "./ResumoPropostaSection";
import { DiferenciaisSection } from "./DiferenciaisSection";
import { RodapeSection } from "./RodapeSection";

interface LandingSectionRendererProps {
  section: LandingSection;
  onFAQOpen?: (questionId: string, questionText: string) => void;
  onFAQClose?: (questionId: string) => void;
}

export function LandingSectionRenderer({ section, onFAQOpen, onFAQClose }: LandingSectionRendererProps) {
  const data = (section.data || {}) as Record<string, unknown>;
  switch (section.type) {
    case "hero":
      return <HeroSection data={data} />;
    case "beneficios":
      return <BeneficiosSection data={data} />;
    case "oferta":
      return <OfertaSection data={data} />;
    case "depoimentos":
      return <DepoimentosSection data={data} />;
    case "faq":
      return <FAQSection data={data} onFAQOpen={onFAQOpen} onFAQClose={onFAQClose} />;
    case "cta":
      return <CTASection data={data} />;
    case "video":
      return <VideoSection data={data} />;
    case "para_quem":
      return <ParaQuemSection data={data} />;
    case "quem_somos":
      return <QuemSomosSection data={data} />;
    case "sobre_projeto":
      return <SobreProjetoSection data={data} />;
    case "servicos_valores":
      return <ServicosValoresSection data={data} />;
    case "nossos_clientes":
      return <NossosClientesSection data={data} />;
    case "cases_sucesso":
      return <CasesSucessoSection data={data} />;
    case "dores_cliente":
      return <DoresClienteSection data={data} />;
    case "produtos_alternados":
      return <ProdutosAlternadosSection data={data} />;
    case "time":
      return <TimeSection data={data} />;
    case "garantia":
      return <GarantiaSection data={data} />;
    case "proximos_passos":
      return <ProximosPassosSection data={data} />;
    case "resumo_proposta":
      return <ResumoPropostaSection data={data} />;
    case "diferenciais":
      return <DiferenciaisSection data={data} />;
    case "rodape":
      return <RodapeSection data={data} />;
    default:
      return null;
  }
}
