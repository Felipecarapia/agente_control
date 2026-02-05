"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, FileText, FileSignature, Layout, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Link2, Paintbrush, BarChart3 } from "lucide-react";
import {
  defaultSectionData,
  SECTION_TYPE_LABELS,
  sectionPreview,
  type LandingSection,
  type SectionType,
} from "@/components/propostas/landing-section-types";
import { SectionEditorForm } from "@/components/propostas/SectionEditorForm";

type Cliente = { id: number; nome: string };
type Projeto = { id: number; nome: string; cliente_id: number };
type Proposta = {
  id: number;
  titulo: string;
  descricao: string | null;
  valor: string | number | null;
  cliente_id: number;
  projeto_id: number | null;
  status: string;
  validade_ate: string | null;
  slug: string | null;
  landing_content: LandingSection[] | null;
};

const emptyForm = {
  titulo: "",
  descricao: "",
  valor: "",
  cliente_id: 0,
  projeto_id: 0,
  status: "rascunho",
  validade_ate: "",
};

function newSectionId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function EditarPropostaPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [form, setForm] = useState(emptyForm);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [landingSections, setLandingSections] = useState<LandingSection[]>([]);
  const [editSectionIndex, setEditSectionIndex] = useState<number | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!id || isNaN(id)) return;
    Promise.all([
      api<Proposta>(`/api/v1/propostas/${id}`),
      api<Cliente[]>("/api/v1/clientes"),
      api<Projeto[]>("/api/v1/projetos"),
    ])
      .then(([p, c, pr]) => {
        setClientes(c);
        setProjetos(pr);
        setSlug(p.slug ?? null);
        setForm({
          titulo: p.titulo || "",
          descricao: p.descricao || "",
          valor: p.valor != null ? String(p.valor) : "",
          cliente_id: p.cliente_id,
          projeto_id: p.projeto_id ?? 0,
          status: p.status || "rascunho",
          validade_ate: p.validade_ate || "",
        });
        setLandingSections(
          Array.isArray(p.landing_content) ? p.landing_content : []
        );
      })
      .catch((e) => setLoadErr(e instanceof Error ? e.message : "Erro ao carregar"));
  }, [id]);

  const projetosDoCliente = form.cliente_id
    ? projetos.filter((p) => p.cliente_id === form.cliente_id)
    : projetos;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || isNaN(id)) return;
    setLoading(true);
    try {
      await api(`/api/v1/propostas/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao || null,
          valor: form.valor ? parseFloat(form.valor) : null,
          cliente_id: form.cliente_id,
          projeto_id: form.projeto_id || null,
          status: form.status,
          validade_ate: form.validade_ate || null,
        }),
      });
      router.push("/dashboard/propostas");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  async function saveLanding() {
    if (!id || isNaN(id)) return;
    setLoading(true);
    try {
      await api(`/api/v1/propostas/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ landing_content: landingSections }),
      });
      setEditSectionIndex(null);
      alert("Página salva.");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  function addSection(type: SectionType) {
    const newLen = landingSections.length + 1;
    setLandingSections((prev) => [
      ...prev,
      { id: newSectionId(), type, data: defaultSectionData(type) },
    ]);
    setAddSectionOpen(false);
    setEditSectionIndex(newLen - 1);
  }

  function updateSectionData(index: number, data: Record<string, unknown>) {
    setLandingSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], data };
      return next;
    });
  }

  function moveSection(index: number, dir: 1 | -1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= landingSections.length) return;
    setLandingSections((prev) => {
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
    if (editSectionIndex === index) setEditSectionIndex(newIndex);
    else if (editSectionIndex === newIndex) setEditSectionIndex(index);
  }

  function removeSection(index: number) {
    setLandingSections((prev) => prev.filter((_, i) => i !== index));
    if (editSectionIndex === index) setEditSectionIndex(null);
    else if (editSectionIndex !== null && editSectionIndex > index)
      setEditSectionIndex(editSectionIndex - 1);
  }

  async function copyOrGenerateLink() {
    if (!id || isNaN(id)) return;
    let currentSlug = slug;
    if (!currentSlug) {
      try {
        const res = await api<{ slug: string }>(`/api/v1/propostas/${id}/gerar-slug`, {
          method: "POST",
        });
        currentSlug = res.slug;
        setSlug(currentSlug);
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Erro ao gerar link");
        return;
      }
    }
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${currentSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      alert("Não foi possível copiar. Link: " + url);
    }
  }

  if (loadErr) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/propostas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-destructive">{loadErr}</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/propostas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Proposta: {form.titulo || "..."}</h1>
            <p className="text-muted-foreground">Edite os dados da proposta</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/dashboard/propostas/${id}/analytics`}>
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Link>
          </Button>
          <Button asChild variant="default" className="gap-2">
            <Link href={`/dashboard/propostas/${id}/builder`}>
              <Paintbrush className="h-4 w-4" />
              Builder
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dados" className="gap-2">
            <FileText className="h-4 w-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="pagina" className="gap-2">
            <Layout className="h-4 w-4" />
            Página
          </TabsTrigger>
          <TabsTrigger value="contratos" className="gap-2">
            <FileSignature className="h-4 w-4" />
            Contratos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6">
          <form onSubmit={submit}>
            <Card className="shadow-sm border-border/80">
              <CardHeader>
                <CardTitle>Dados da proposta</CardTitle>
                <p className="text-sm text-muted-foreground">Título, cliente, projeto, valor e status.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={form.titulo}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                    required
                    placeholder="Ex: Proposta Site Institucional"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <textarea
                    id="descricao"
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    placeholder="Escopo, entregas, condições..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Cliente</Label>
                  <select
                    className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.cliente_id}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        cliente_id: Number(e.target.value),
                        projeto_id: 0,
                      }))
                    }
                  >
                    <option value={0}>Selecione um cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label>Projeto (opcional)</Label>
                  <select
                    className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.projeto_id}
                    onChange={(e) => setForm((f) => ({ ...f, projeto_id: Number(e.target.value) }))}
                  >
                    <option value={0}>Nenhum</option>
                    {projetosDoCliente.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="enviada">Enviada</option>
                    <option value="aceita">Aceita</option>
                    <option value="recusada">Recusada</option>
                  </select>
                </div>

                <div className="grid gap-2 max-w-[200px]">
                  <Label htmlFor="validade_ate">Validade até</Label>
                  <Input
                    id="validade_ate"
                    type="date"
                    value={form.validade_ate}
                    onChange={(e) => setForm((f) => ({ ...f, validade_ate: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 mt-6">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/propostas">Cancelar</Link>
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="pagina" className="mt-6">
          <Card className="shadow-sm border-border/80">
            <CardHeader>
              <CardTitle>Landing da proposta</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monte a página que o cliente verá. Adicione seções, edite e reordene.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="default" className="gap-2">
                  <Link href={`/dashboard/propostas/${id}/builder`} className="flex items-center gap-2">
                    <Paintbrush className="h-4 w-4" />
                    Editar no Builder
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href={`/dashboard/propostas/${id}/analytics`} className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyOrGenerateLink}
                  className="gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  {slug ? "Copiar link" : "Gerar link"}
                </Button>
                {linkCopied && (
                  <span className="text-sm text-primary font-medium">Link copiado!</span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddSectionOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar seção
                </Button>
                {addSectionOpen && (
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(SECTION_TYPE_LABELS) as SectionType[]).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addSection(type)}
                      >
                        {SECTION_TYPE_LABELS[type]}
                      </Button>
                    ))}
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAddSectionOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
              <ul className="space-y-2">
                {landingSections.map((section, index) => (
                  <li
                    key={section.id}
                    className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30"
                  >
                    <span className="flex-1 truncate text-sm font-medium">
                      {SECTION_TYPE_LABELS[section.type]}: {sectionPreview(section)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(index, -1)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(index, 1)}
                        disabled={index === landingSections.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditSectionIndex(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {landingSections.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhuma seção ainda. Clique em Adicionar seção.</p>
              )}
              <Button type="button" onClick={saveLanding} disabled={loading}>
                {loading ? "Salvando..." : "Salvar página"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratos" className="mt-6">
          <Card className="shadow-sm border-border/80">
            <CardHeader>
              <CardTitle>Contratos</CardTitle>
              <p className="text-sm text-muted-foreground">Contratos gerados a partir desta proposta.</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Em breve: listagem de contratos vinculados.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editSectionIndex !== null} onOpenChange={(open) => !open && setEditSectionIndex(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editSectionIndex !== null && landingSections[editSectionIndex]
                ? SECTION_TYPE_LABELS[landingSections[editSectionIndex].type]
                : "Editar seção"}
            </DialogTitle>
          </DialogHeader>
          {editSectionIndex !== null && landingSections[editSectionIndex] && (
            <SectionEditorForm
              section={landingSections[editSectionIndex]}
              onChange={(data) => updateSectionData(editSectionIndex, data)}
              propostaId={id}
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditSectionIndex(null)}>
              Fechar
            </Button>
            <Button type="button" onClick={saveLanding} disabled={loading}>
              Salvar página
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
