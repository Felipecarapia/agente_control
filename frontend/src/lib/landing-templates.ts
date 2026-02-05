import type { LandingSection } from "@/components/propostas/landing-section-types";
import { defaultSectionData } from "@/components/propostas/landing-section-types";

export type TemplateId = "branco" | "azul";

export interface LandingTemplate {
  id: TemplateId;
  name: string;
  description: string;
  /** Se não tiver preset, usa [] (página em branco). */
  preset: LandingSection[] | null;
}

function newSectionId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function presetSection(type: LandingSection["type"], data: Record<string, unknown>): LandingSection {
  return {
    id: newSectionId(),
    type,
    data: { ...defaultSectionData(type), ...data },
  };
}

/** Modelos pré-definidos. "Azul" = tema escuro/ciano que estamos usando. */
export const LANDING_TEMPLATES: LandingTemplate[] = [
  {
    id: "branco",
    name: "Em branco",
    description: "Página vazia. Arraste os elementos e monte do zero.",
    preset: null,
  },
  {
    id: "azul",
    name: "Azul (padrão)",
    description: "Modelo com tema escuro e destaque em ciano. Começa com exemplo de estrutura.",
    preset: [
      presetSection("hero", {
        headline: "Sua headline aqui",
        headline_highlight: "aqui",
        subheadline: "Subtítulo da proposta",
        cta_text: "Quero saber mais",
      }),
      presetSection("quem_somos", {
        titulo: "Quem Somos",
        titulo_highlight: "Somos",
        conteudo: "Texto sobre sua empresa...",
      }),
      presetSection("oferta", {
        titulo: "Oferta",
        valor: "R$ 1.997",
        cta_text: "Garantir minha vaga",
      }),
      presetSection("cta", {
        headline: "Última chance",
        cta_text: "Fechar agora",
      }),
    ],
  },
];

export function getTemplateById(id: TemplateId): LandingTemplate | undefined {
  return LANDING_TEMPLATES.find((t) => t.id === id);
}

/** Retorna o conteúdo inicial da página para o modelo (array de seções ou vazio). */
export function getTemplatePreset(templateId: TemplateId): LandingSection[] {
  const t = getTemplateById(templateId);
  if (!t || !t.preset) return [];
  return t.preset.map((s) => ({ ...s, id: newSectionId() }));
}
