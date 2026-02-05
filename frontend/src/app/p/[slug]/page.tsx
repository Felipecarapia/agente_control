import { notFound } from "next/navigation";
import { ProposalPageClient } from "@/components/propostas/landing/ProposalPageClient";
import type { LandingSection } from "@/components/propostas/landing-section-types";

type PropostaPublic = {
  id: number;
  titulo: string;
  descricao: string | null;
  valor: string | number | null;
  validade_ate: string | null;
  cliente_nome: string;
  landing_content: LandingSection[] | null;
  slug: string | null;
};

async function getPropostaBySlug(slug: string): Promise<PropostaPublic | null> {
  // Server Component: usa BACKEND_URL diretamente (não há Mixed Content no servidor)
  // Se não tiver BACKEND_URL, tenta NEXT_PUBLIC_API_URL como fallback
  const base = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${base}/api/v1/propostas/public/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function PropostaLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPropostaBySlug(slug);
  if (!data) notFound();

  const sections = Array.isArray(data.landing_content) ? data.landing_content : [];

  return <ProposalPageClient slug={slug} sections={sections} />;
}
