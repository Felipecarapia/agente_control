"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, Link2, ExternalLink } from "lucide-react";
import {
  defaultSectionData,
  SECTION_TYPE_LABELS,
  type LandingSection,
  type SectionType,
} from "@/components/propostas/landing-section-types";
import { SectionEditorForm } from "@/components/propostas/SectionEditorForm";
import { WidgetSidebar } from "@/components/propostas/builder/WidgetSidebar";
import { BuilderPreview } from "@/components/propostas/builder/BuilderPreview";
import {
  LANDING_TEMPLATES,
  getTemplatePreset,
  type TemplateId,
} from "@/lib/landing-templates";

type Proposta = {
  id: string;
  titulo: string;
  slug: string | null;
  landing_content: LandingSection[] | null;
};

function newSectionId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function BuilderPropostaPage() {
  const params = useParams();
  const id = params.id;
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [templateId, setTemplateId] = useState<TemplateId>("branco");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  function showNotice(type: "success" | "error" | "info", message: string) {
    setNotice({ type, message });
    // Proteger contra SSR: só usar setTimeout no client
    if (typeof window !== "undefined") {
      window.setTimeout(() => setNotice(null), 2500);
    }
  }

  useEffect(() => {
    if (!id) return;
    api<Proposta>(`/api/v1/propostas/${id}`)
      .then((p) => {
        setProposta(p);
        const content = Array.isArray(p.landing_content) ? p.landing_content : [];
        setSections(content);
        setTemplateId(content.length > 0 ? "azul" : "branco");
      })
      .catch((e) => setLoadErr(e instanceof Error ? e.message : "Erro ao carregar"));
  }, [id]);

  function applyTemplate(tid: TemplateId) {
    const preset = getTemplatePreset(tid);
    if (sections.length > 0 && preset.length > 0) {
      // Proteger contra SSR: só usar window.confirm no client
      if (typeof window !== "undefined" && !window.confirm("Aplicar modelo vai substituir o conteúdo atual. Continuar?")) {
        return;
      }
    }
    setTemplateId(tid);
    setSections(preset);
    setSelectedIndex(null);
    setEditIndex(null);
  }

  function addSection(type: SectionType, atIndex?: number) {
    const newSection: LandingSection = {
      id: newSectionId(),
      type,
      data: defaultSectionData(type),
    };
    setSections((prev) => {
      const next = [...prev];
      if (atIndex != null) next.splice(atIndex, 0, newSection);
      else next.push(newSection);
      return next;
    });
    const idx = atIndex != null ? atIndex : sections.length;
    setSelectedIndex(idx);
    setEditIndex(idx);
  }

  function updateSectionData(index: number, data: Record<string, unknown>) {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], data };
      return next;
    });
  }

  function moveSection(from: number, dir: 1 | -1) {
    const newIndex = from + dir;
    if (newIndex < 0 || newIndex >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      [next[from], next[newIndex]] = [next[newIndex], next[from]];
      return next;
    });
    if (editIndex === from) setEditIndex(newIndex);
    else if (editIndex === newIndex) setEditIndex(from);
    setSelectedIndex(editIndex === from ? newIndex : editIndex === newIndex ? from : selectedIndex);
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
    if (editIndex === index) setEditIndex(null);
    else if (editIndex != null && editIndex > index) setEditIndex(editIndex - 1);
    setSelectedIndex(null);
  }

  async function saveBuilder() {
    if (!id) return;
    setLoading(true);
    try {
      await api(`/api/v1/propostas/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ landing_content: sections }),
      });
      setEditIndex(null);
      showNotice("success", "Página salva.");
    } catch (err: any) {
      const errorCode = err?.code || "UNKNOWN";
      const errorMsg = err?.message || "Erro ao salvar página";
      
      if (errorCode === "PROPOSAL_NOT_FOUND") {
        showNotice("error", "Proposta não encontrada.");
      } else {
        showNotice("error", errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyOrGenerateLink() {
    if (!id || !proposta) return;
    let currentSlug = proposta.slug;
    if (!currentSlug) {
      try {
        const res = await api<{ slug: string }>(`/api/v1/propostas/${id}/gerar-slug`, {
          method: "POST",
        });
        currentSlug = res.slug;
        setProposta((p) => (p ? { ...p, slug: currentSlug } : null));
      } catch (err: any) {
        const errorCode = err?.code || "UNKNOWN";
        const errorMsg = err?.message || "Erro ao gerar link";
        
        if (errorCode === "PROPOSAL_NOT_FOUND") {
          showNotice("error", "Proposta não encontrada.");
        } else if (errorCode === "SLUG_GENERATION_FAILED") {
          showNotice("error", "Não foi possível gerar um link único. Tente novamente.");
        } else {
          showNotice("error", errorMsg);
        }
        return;
      }
    }
    
    // Proteger contra SSR: só usar window/navigator no client
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      showNotice("error", "Link gerado, mas não foi possível copiar automaticamente.");
      return;
    }
    
    const url = `${window.location.origin}/p/${currentSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showNotice("error", "Não foi possível copiar o link.");
    }
  }

  if (loadErr) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <p className="text-destructive">{loadErr}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={`/dashboard/propostas/${id}`}>Voltar</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!proposta) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-2">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white">
            <Link href={`/dashboard/propostas/${id}`} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <span className="text-sm text-slate-500">|</span>
          <span className="font-medium truncate max-w-[200px]">{proposta.titulo}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Modelo:</span>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value as TemplateId)}
              className="h-8 w-[180px] rounded-md border border-slate-600 bg-slate-800 px-3 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              {LANDING_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            onClick={copyOrGenerateLink}
          >
            {linkCopied ? "Copiado!" : "Copiar link"}
            <Link2 className="ml-2 h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-500"
            onClick={saveBuilder}
            disabled={loading}
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Salvando..." : "Salvar"}
          </Button>
          <Button asChild size="sm" variant="secondary">
            <a
              href={proposta.slug ? `/p/${proposta.slug}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Visualizar
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {notice && (
        <div
          className={`shrink-0 border-b px-4 py-2 text-sm ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : notice.type === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-slate-600 bg-slate-800 text-slate-200"
          }`}
        >
          {notice.message}
        </div>
      )}

      {/* Builder body: sidebar de widgets + prévia ao vivo no centro */}
      <div className="flex flex-1 min-h-0">
        <WidgetSidebar />
        <BuilderPreview
          sections={sections}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          onEdit={setEditIndex}
          onDrop={addSection}
        />
      </div>

      {/* Edit section dialog */}
      <Dialog open={editIndex !== null} onOpenChange={(open) => !open && setEditIndex(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-slate-700 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editIndex !== null && sections[editIndex]
                ? SECTION_TYPE_LABELS[sections[editIndex].type]
                : "Editar seção"}
            </DialogTitle>
          </DialogHeader>
          {editIndex !== null && sections[editIndex] && (
            <SectionEditorForm
              section={sections[editIndex]}
              onChange={(data) => updateSectionData(editIndex, data)}
              propostaId={id}
            />
          )}
          <DialogFooter className="flex-wrap gap-2">
            {editIndex !== null && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editIndex > 0 && (moveSection(editIndex, -1), setEditIndex(editIndex - 1))}
                  disabled={editIndex === 0}
                >
                  Subir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editIndex < sections.length - 1 && (moveSection(editIndex, 1), setEditIndex(editIndex + 1))}
                  disabled={editIndex === sections.length - 1}
                >
                  Descer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    removeSection(editIndex);
                    setEditIndex(null);
                  }}
                >
                  Remover seção
                </Button>
              </>
            )}
            <Button type="button" variant="outline" onClick={() => setEditIndex(null)}>
              Fechar
            </Button>
            <Button type="button" onClick={saveBuilder} disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
