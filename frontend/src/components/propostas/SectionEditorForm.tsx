"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LandingSection, SectionType } from "./landing-section-types";
import { ImageUpload } from "./ImageUpload";

type Props = {
  section: LandingSection;
  onChange: (data: Record<string, unknown>) => void;
  propostaId?: number;
};

function setData(
  current: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const key = path.split(".")[0];
  if (path.includes(".")) {
    const rest = path.slice(key.length + 1);
    const sub = (current[key] as Record<string, unknown>) || {};
    return { ...current, [key]: setData(sub as Record<string, unknown>, rest, value) };
  }
  return { ...current, [key]: value };
}

export function SectionEditorForm({ section, onChange, propostaId }: Props) {
  const d = (section.data || {}) as Record<string, unknown>;
  const update = (path: string, value: unknown) =>
    onChange(setData({ ...d }, path, value));

  switch (section.type) {
    case "hero":
      return (
        <div className="space-y-4">
          {propostaId ? (
            <ImageUpload
              propostaId={propostaId}
              value={(d.logo_url as string) ?? ""}
              onChange={(url) => update("logo_url", url)}
              label="Logo (acima da headline)"
            />
          ) : (
            <div className="grid gap-2">
              <Label>URL do logo (acima da headline)</Label>
              <Input
                value={(d.logo_url as string) ?? ""}
                onChange={(e) => update("logo_url", e.target.value)}
                placeholder="https://... ou use upload na aba Página"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>Headline</Label>
            <Input
              value={(d.headline as string) ?? ""}
              onChange={(e) => update("headline", e.target.value)}
              placeholder="Título principal"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque na headline (aparece em azul)</Label>
            <Input
              value={(d.headline_highlight as string) ?? ""}
              onChange={(e) => update("headline_highlight", e.target.value)}
              placeholder="Ex: todas as áreas da sua vida"
            />
          </div>
          <div className="grid gap-2">
            <Label>Subheadline</Label>
            <Input
              value={(d.subheadline as string) ?? ""}
              onChange={(e) => update("subheadline", e.target.value)}
              placeholder="Subtítulo"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque na subheadline (aparece em azul)</Label>
            <Input
              value={(d.subheadline_highlight as string) ?? ""}
              onChange={(e) => update("subheadline_highlight", e.target.value)}
              placeholder="Ex: milhares de pessoas impactadas"
            />
          </div>
          {/* Informações da Proposta */}
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Informações da Proposta</Label>
            <p className="text-xs text-muted-foreground">
              Dados que aparecem abaixo do subtítulo com ícones
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">Proposta Nº</Label>
                <Input
                  value={(d.proposta_numero as string) ?? ""}
                  onChange={(e) => update("proposta_numero", e.target.value)}
                  placeholder="Ex: 2024-001"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Cliente</Label>
                <Input
                  value={(d.cliente as string) ?? ""}
                  onChange={(e) => update("cliente", e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Responsável</Label>
                <Input
                  value={(d.responsavel as string) ?? ""}
                  onChange={(e) => update("responsavel", e.target.value)}
                  placeholder="Nome do responsável"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Telefone</Label>
                <Input
                  value={(d.telefone as string) ?? ""}
                  onChange={(e) => update("telefone", e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </div>
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Cores do Hero</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Cor do texto</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "white", label: "Branco", preview: "bg-white" },
                  { value: "light", label: "Cinza claro", preview: "bg-slate-200" },
                  { value: "slate", label: "Escuro", preview: "bg-slate-800" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("cor_texto", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.cor_texto as string) === opt.value || (!d.cor_texto && opt.value === "white")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Cor do destaque (trechos em destaque)</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
                  { value: "green", label: "Verde", preview: "bg-green-500" },
                  { value: "orange", label: "Laranja", preview: "bg-orange-500" },
                  { value: "purple", label: "Roxo", preview: "bg-purple-500" },
                  { value: "blue", label: "Azul", preview: "bg-blue-500" },
                  { value: "yellow", label: "Amarelo", preview: "bg-yellow-500" },
                  { value: "red", label: "Vermelho", preview: "bg-red-500" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("cor_destaque", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.cor_destaque as string) === opt.value || (!d.cor_destaque && opt.value === "cyan")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Texto do botão (CTA)</Label>
            <Input
              value={(d.cta_text as string) ?? ""}
              onChange={(e) => update("cta_text", e.target.value)}
              placeholder="Ex: Quero fechar"
            />
          </div>
          <div className="grid gap-2">
            <Label>URL do botão (opcional)</Label>
            <Input
              value={(d.cta_url as string) ?? ""}
              onChange={(e) => update("cta_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          {propostaId ? (
            <ImageUpload
              propostaId={propostaId}
              value={(d.background_image_url as string) ?? ""}
              onChange={(url) => update("background_image_url", url)}
              label="Imagem de fundo (opcional)"
            />
          ) : (
            <div className="grid gap-2">
              <Label>URL da imagem de fundo (opcional)</Label>
              <Input
                value={(d.background_image_url as string) ?? ""}
                onChange={(e) => update("background_image_url", e.target.value)}
                placeholder="https://... ou use upload na aba Página"
              />
            </div>
          )}
        </div>
      );

    case "beneficios": {
      const items = (d.items as Array<{ titulo?: string; descricao?: string; icon?: string }>) ?? [];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Benefícios"
            />
          </div>
          {items.map((item, i) => (
            <div key={i} className="rounded border p-3 space-y-2">
              <Label>Item {i + 1}</Label>
              <Input
                value={item.titulo ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], titulo: e.target.value };
                  update("items", next);
                }}
                placeholder="Título"
              />
              <Input
                value={item.descricao ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], descricao: e.target.value };
                  update("items", next);
                }}
                placeholder="Descrição"
              />
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => update("items", [...items, { titulo: "", descricao: "", icon: "" }])}
          >
            + Adicionar item
          </button>
        </div>
      );
    }

    case "oferta": {
      const destaques = (d.destaques as string[]) ?? [""];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Sua oferta"
            />
          </div>
          <div className="grid gap-2">
            <Label>Valor (ex: R$ 1.997)</Label>
            <Input
              value={(d.valor as string) ?? ""}
              onChange={(e) => update("valor", e.target.value)}
              placeholder="R$ 1.997"
            />
          </div>
          <div className="grid gap-2">
            <Label>Parcelas (opcional)</Label>
            <Input
              value={(d.parcelas as string) ?? ""}
              onChange={(e) => update("parcelas", e.target.value)}
              placeholder="12x de R$ 166"
            />
          </div>
          <div className="grid gap-2">
            <Label>Garantia (opcional)</Label>
            <Input
              value={(d.garantia as string) ?? ""}
              onChange={(e) => update("garantia", e.target.value)}
              placeholder="7 dias de garantia"
            />
          </div>
          <div className="grid gap-2">
            <Label>Texto do botão</Label>
            <Input
              value={(d.cta_text as string) ?? ""}
              onChange={(e) => update("cta_text", e.target.value)}
              placeholder="Quero garantir"
            />
          </div>
          <div className="grid gap-2">
            <Label>Destaques (um por linha)</Label>
            {destaques.map((s, i) => (
              <Input
                key={i}
                value={s}
                onChange={(e) => {
                  const next = [...destaques];
                  next[i] = e.target.value;
                  update("destaques", next);
                }}
                placeholder="Destaque"
              />
            ))}
            <button
              type="button"
              className="text-sm text-primary"
              onClick={() => update("destaques", [...destaques, ""])}
            >
              + Adicionar destaque
            </button>
          </div>
        </div>
      );
    }

    case "depoimentos": {
      const items = (d.items as Array<{ nome?: string; texto?: string; role?: string; avatar_url?: string }>) ?? [];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="O que dizem"
            />
          </div>
          {items.map((item, i) => (
            <div key={i} className="rounded border p-3 space-y-2">
              <Label>Depoimento {i + 1}</Label>
              <Input
                value={item.nome ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], nome: e.target.value };
                  update("items", next);
                }}
                placeholder="Nome"
              />
              <Input
                value={item.role ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], role: e.target.value };
                  update("items", next);
                }}
                placeholder="Cargo / Empresa"
              />
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.texto ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], texto: e.target.value };
                  update("items", next);
                }}
                placeholder="Texto do depoimento"
              />
              {propostaId ? (
                <ImageUpload
                  propostaId={propostaId}
                  value={item.avatar_url ?? ""}
                  onChange={(url) => {
                    const next = [...items];
                    next[i] = { ...next[i], avatar_url: url };
                    update("items", next);
                  }}
                  label="Foto"
                />
              ) : (
                <Input
                  value={item.avatar_url ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], avatar_url: e.target.value };
                    update("items", next);
                  }}
                  placeholder="URL da foto (ou use upload)"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() =>
              update("items", [...items, { nome: "", texto: "", role: "", avatar_url: "" }])
            }
          >
            + Adicionar depoimento
          </button>
        </div>
      );
    }

    case "faq": {
      const items = (d.items as Array<{ pergunta?: string; resposta?: string }>) ?? [];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Dúvidas frequentes:"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título (opcional)</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: frequentes:"
            />
          </div>
          {items.map((item, i) => (
            <div key={i} className="rounded border p-3 space-y-2">
              <Label>Pergunta {i + 1}</Label>
              <Input
                value={item.pergunta ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], pergunta: e.target.value };
                  update("items", next);
                }}
                placeholder="Pergunta"
              />
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.resposta ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], resposta: e.target.value };
                  update("items", next);
                }}
                placeholder="Resposta"
              />
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => update("items", [...items, { pergunta: "", resposta: "" }])}
          >
            + Adicionar pergunta
          </button>
        </div>
      );
    }

    case "cta":
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Headline</Label>
            <Input
              value={(d.headline as string) ?? ""}
              onChange={(e) => update("headline", e.target.value)}
              placeholder="Última chance"
            />
          </div>
          <div className="grid gap-2">
            <Label>Subheadline (opcional)</Label>
            <Input
              value={(d.subheadline as string) ?? ""}
              onChange={(e) => update("subheadline", e.target.value)}
              placeholder="Não perca"
            />
          </div>
          <div className="grid gap-2">
            <Label>Texto do botão</Label>
            <Input
              value={(d.cta_text as string) ?? ""}
              onChange={(e) => update("cta_text", e.target.value)}
              placeholder="Quero fechar agora"
            />
          </div>
          <div className="grid gap-2">
            <Label>URL do botão (opcional)</Label>
            <Input
              value={(d.cta_url as string) ?? ""}
              onChange={(e) => update("cta_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      );

    case "video":
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: O Método que você precisa fazer para prosperar"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título (azul + sublinhado)</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: fazer para prosperar"
            />
          </div>
          <div className="grid gap-2">
            <Label>URL do vídeo (YouTube, Vimeo)</Label>
            <Input
              value={(d.video_url as string) ?? ""}
              onChange={(e) => update("video_url", e.target.value)}
              placeholder="https://youtube.com/..."
            />
          </div>
          <div className="grid gap-2">
            <Label>URL da thumbnail (opcional)</Label>
            <Input
              value={(d.thumbnail_url as string) ?? ""}
              onChange={(e) => update("thumbnail_url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="grid gap-2">
            <Label>Texto do botão (CTA)</Label>
            <Input
              value={(d.cta_text as string) ?? ""}
              onChange={(e) => update("cta_text", e.target.value)}
              placeholder="Ex: QUERO ENTRAR NO MÉTODO"
            />
          </div>
          <div className="grid gap-2">
            <Label>URL do botão (opcional)</Label>
            <Input
              value={(d.cta_url as string) ?? ""}
              onChange={(e) => update("cta_url", e.target.value)}
              placeholder="https://... ou #oferta"
            />
          </div>
        </div>
      );

    case "para_quem": {
      const items = (d.items as Array<{ titulo?: string; descricao?: string; image_url?: string }>) ?? [];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Para quem é o Método IP"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título (aparece em azul)</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Método IP"
            />
          </div>
          {items.map((item, i) => (
            <div key={i} className="rounded border p-4 space-y-2 bg-muted/30">
              <Label>Card {i + 1}</Label>
              <Input
                value={item.titulo ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], titulo: e.target.value };
                  update("items", next);
                }}
                placeholder="Título do card"
              />
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.descricao ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], descricao: e.target.value };
                  update("items", next);
                }}
                placeholder="Descrição"
              />
              {propostaId ? (
                <ImageUpload
                  propostaId={propostaId}
                  value={item.image_url ?? ""}
                  onChange={(url) => {
                    const next = [...items];
                    next[i] = { ...next[i], image_url: url };
                    update("items", next);
                  }}
                  label="Imagem do card (opcional)"
                />
              ) : (
                <div className="grid gap-2">
                  <Label>URL da imagem (opcional)</Label>
                  <Input
                    value={item.image_url ?? ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], image_url: e.target.value };
                      update("items", next);
                    }}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() =>
              update("items", [...items, { titulo: "", descricao: "", image_url: "" }])
            }
          >
            + Adicionar card
          </button>
        </div>
      );
    }

    case "quem_somos": {
      const badges = (d.badges as Array<{ valor?: string; label?: string; icone?: string }>) ?? [];
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
      ];
      const bgCorOptions = [
        { value: "escuro", label: "Escuro", preview: "bg-slate-800" },
        { value: "azul_escuro", label: "Azul escuro", preview: "bg-blue-950" },
        { value: "claro", label: "Claro", preview: "bg-slate-100" },
        { value: "cinza", label: "Cinza", preview: "bg-slate-300" },
      ];
      const iconeOptions = [
        { value: "award", label: "Troféu" },
        { value: "users", label: "Pessoas" },
        { value: "calendar", label: "Calendário" },
        { value: "trending", label: "Crescimento" },
      ];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Quem Somos"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Somos"
            />
          </div>
          <div className="grid gap-2">
            <Label>Conteúdo (texto principal)</Label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={(d.conteudo as string) ?? ""}
              onChange={(e) => update("conteudo", e.target.value)}
              placeholder="Texto sobre a empresa..."
            />
          </div>

          {/* Cores */}
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Aparência</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Cor de fundo</Label>
              <div className="flex flex-wrap gap-2">
                {bgCorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("bg_cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.bg_cor as string) === opt.value || (!d.bg_cor && opt.value === "escuro")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Cor do destaque</Label>
              <div className="flex flex-wrap gap-2">
                {corOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.cor as string) === opt.value || (!d.cor && opt.value === "cyan")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Imagens */}
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Imagens</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Logo (opcional)</Label>
              {propostaId ? (
                <ImageUpload
                  propostaId={propostaId}
                  value={(d.logo_url as string) ?? ""}
                  onChange={(url) => update("logo_url", url)}
                  label="Logo da empresa"
                />
              ) : (
                <Input
                  value={(d.logo_url as string) ?? ""}
                  onChange={(e) => update("logo_url", e.target.value)}
                  placeholder="URL da logo"
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Imagem lateral (opcional)</Label>
              {propostaId ? (
                <ImageUpload
                  propostaId={propostaId}
                  value={(d.image_url as string) ?? ""}
                  onChange={(url) => update("image_url", url)}
                  label="Imagem ao lado do texto"
                />
              ) : (
                <Input
                  value={(d.image_url as string) ?? ""}
                  onChange={(e) => update("image_url", e.target.value)}
                  placeholder="URL da imagem"
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Imagem de fundo (opcional)</Label>
              {propostaId ? (
                <ImageUpload
                  propostaId={propostaId}
                  value={(d.background_image_url as string) ?? ""}
                  onChange={(url) => update("background_image_url", url)}
                  label="Imagem de fundo da seção"
                />
              ) : (
                <Input
                  value={(d.background_image_url as string) ?? ""}
                  onChange={(e) => update("background_image_url", e.target.value)}
                  placeholder="URL da imagem de fundo"
                />
              )}
            </div>
          </div>

          {/* Badges de números */}
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Números / Conquistas (opcional)</Label>
            <p className="text-xs text-muted-foreground">Ex: "10+ Anos", "+500 Clientes", etc.</p>
            {badges.map((badge, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input
                    value={badge.valor ?? ""}
                    onChange={(e) => {
                      const next = [...badges];
                      next[i] = { ...next[i], valor: e.target.value };
                      update("badges", next);
                    }}
                    placeholder="10+"
                    className="text-center"
                  />
                  <Input
                    value={badge.label ?? ""}
                    onChange={(e) => {
                      const next = [...badges];
                      next[i] = { ...next[i], label: e.target.value };
                      update("badges", next);
                    }}
                    placeholder="Anos"
                  />
                  <select
                    value={badge.icone ?? "award"}
                    onChange={(e) => {
                      const next = [...badges];
                      next[i] = { ...next[i], icone: e.target.value };
                      update("badges", next);
                    }}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {iconeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="text-xs text-destructive px-2 py-2"
                  onClick={() => {
                    const next = badges.filter((_, idx) => idx !== i);
                    update("badges", next);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() => update("badges", [...badges, { valor: "", label: "", icone: "award" }])}
            >
              + Adicionar número/conquista
            </button>
          </div>
        </div>
      );
    }

    case "sobre_projeto":
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Sobre o Projeto"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título (aparece em azul)</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Projeto"
            />
          </div>
          <div className="grid gap-2">
            <Label>Conteúdo (texto da seção)</Label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={(d.conteudo as string) ?? ""}
              onChange={(e) => update("conteudo", e.target.value)}
              placeholder="Descrição do projeto..."
            />
          </div>
        </div>
      );

    case "servicos_valores": {
      const items = (d.items as Array<{ titulo?: string; descricao?: string; valor?: string }>) ?? [];
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
        { value: "yellow", label: "Amarelo", preview: "bg-yellow-500" },
        { value: "red", label: "Vermelho", preview: "bg-red-500" },
      ];
      const bgCorOptions = [
        { value: "escuro", label: "Escuro", preview: "bg-slate-800" },
        { value: "azul_escuro", label: "Azul escuro", preview: "bg-blue-950" },
        { value: "verde_escuro", label: "Verde escuro", preview: "bg-emerald-950" },
        { value: "roxo_escuro", label: "Roxo escuro", preview: "bg-purple-950" },
        { value: "claro", label: "Claro", preview: "bg-slate-100" },
        { value: "cinza", label: "Cinza", preview: "bg-slate-300" },
      ];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Serviços e Valores"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Valores"
            />
          </div>
          <div className="grid gap-2">
            <Label>Valor total (linha totalizadora na tabela)</Label>
            <Input
              value={(d.valor_total as string) ?? ""}
              onChange={(e) => update("valor_total", e.target.value)}
              placeholder="Ex: R$ 5.000 ou Total: R$ 3.997"
            />
          </div>

          {/* Cores */}
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Cores da tabela</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Cor de fundo</Label>
              <div className="flex flex-wrap gap-2">
                {bgCorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("bg_cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.bg_cor as string) === opt.value || (!d.bg_cor && opt.value === "escuro")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Cor do destaque (bordas, valores, títulos)</Label>
              <div className="flex flex-wrap gap-2">
                {corOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.cor as string) === opt.value || (!d.cor && opt.value === "cyan")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {items.map((item, i) => (
            <div key={i} className="rounded border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Item {i + 1}</Label>
                {items.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => {
                      const next = items.filter((_, idx) => idx !== i);
                      update("items", next);
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
              <Input
                value={item.titulo ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], titulo: e.target.value };
                  update("items", next);
                }}
                placeholder="Nome do serviço"
              />
              <Input
                value={item.valor ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], valor: e.target.value };
                  update("items", next);
                }}
                placeholder="Valor (ex: R$ 1.500)"
              />
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.descricao ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], descricao: e.target.value };
                  update("items", next);
                }}
                placeholder="Descrição"
              />
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => update("items", [...items, { titulo: "", descricao: "", valor: "" }])}
          >
            + Adicionar serviço
          </button>
        </div>
      );
    }

    case "nossos_clientes": {
      const items = (d.items as Array<{ logo_url?: string; nome?: string }>) ?? [];
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
      ];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Nossos Clientes"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Clientes"
            />
          </div>
          <div className="grid gap-2">
            <Label>Cor de destaque</Label>
            <div className="flex flex-wrap gap-2">
              {corOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("cor", opt.value)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm ${
                    (d.cor ?? "cyan") === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/30 hover:border-muted-foreground/50"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${opt.preview}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {items.map((item, i) => (
            <div key={i} className="rounded border p-3 space-y-2">
              <Label>Logo cliente {i + 1}</Label>
              <Input
                value={item.nome ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], nome: e.target.value };
                  update("items", next);
                }}
                placeholder="Nome do cliente (alt da logo)"
              />
              {propostaId ? (
                <ImageUpload
                  propostaId={propostaId}
                  value={item.logo_url ?? ""}
                  onChange={(url) => {
                    const next = [...items];
                    next[i] = { ...next[i], logo_url: url };
                    update("items", next);
                  }}
                  label="Logo do cliente"
                />
              ) : (
                <div className="grid gap-2">
                  <Label>URL da logo</Label>
                  <Input
                    value={item.logo_url ?? ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], logo_url: e.target.value };
                      update("items", next);
                    }}
                    placeholder="https://... ou use upload"
                  />
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => update("items", [...items, { logo_url: "", nome: "" }])}
          >
            + Adicionar cliente
          </button>
        </div>
      );
    }

    case "cases_sucesso": {
      const items = (d.items as Array<{ titulo?: string; descricao?: string; image_url?: string; cliente?: string }>) ?? [];
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
      ];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Cases de Sucesso"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Sucesso"
            />
          </div>
          <div className="grid gap-2">
            <Label>Cor de destaque</Label>
            <div className="flex flex-wrap gap-2">
              {corOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("cor", opt.value)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm ${
                    (d.cor ?? "cyan") === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/30 hover:border-muted-foreground/50"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${opt.preview}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {items.map((item, i) => (
            <div key={i} className="rounded border p-4 space-y-2 bg-muted/30">
              <Label>Case {i + 1}</Label>
              <Input
                value={item.cliente ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], cliente: e.target.value };
                  update("items", next);
                }}
                placeholder="Nome do cliente"
              />
              <Input
                value={item.titulo ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], titulo: e.target.value };
                  update("items", next);
                }}
                placeholder="Título do case"
              />
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.descricao ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], descricao: e.target.value };
                  update("items", next);
                }}
                placeholder="Descrição / resultado"
              />
              {propostaId ? (
                <ImageUpload
                  propostaId={propostaId}
                  value={item.image_url ?? ""}
                  onChange={(url) => {
                    const next = [...items];
                    next[i] = { ...next[i], image_url: url };
                    update("items", next);
                  }}
                  label="Imagem do case (opcional)"
                />
              ) : (
                <div className="grid gap-2">
                  <Label>URL da imagem (opcional)</Label>
                  <Input
                    value={item.image_url ?? ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], image_url: e.target.value };
                      update("items", next);
                    }}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() =>
              update("items", [...items, { titulo: "", descricao: "", image_url: "", cliente: "" }])
            }
          >
            + Adicionar case
          </button>
        </div>
      );
    }

    case "dores_cliente": {
      const items = (d.items as Array<{ titulo?: string; descricao?: string; icone?: string }>) ?? [];
      const iconeOptions = [
        { value: "clock", label: "Relógio (tempo)" },
        { value: "eye-off", label: "Olho fechado (falta visibilidade)" },
        { value: "folders", label: "Pastas (dados espalhados)" },
        { value: "repeat", label: "Repetir (retrabalho)" },
        { value: "bar-chart", label: "Gráfico (métricas)" },
        { value: "message-x", label: "Mensagem X (comunicação falha)" },
        { value: "alert", label: "Alerta (genérico)" },
      ];
      const corOptions = [
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "red", label: "Vermelho", preview: "bg-red-500" },
        { value: "cyan", label: "Ciano / Azul", preview: "bg-cyan-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "yellow", label: "Amarelo", preview: "bg-yellow-500" },
      ];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Você está passando por isso?"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: passando por isso"
            />
          </div>
          <div className="grid gap-2">
            <Label>Subtítulo (opcional)</Label>
            <Input
              value={(d.subtitulo as string) ?? ""}
              onChange={(e) => update("subtitulo", e.target.value)}
              placeholder="Ex: Sabemos como é difícil lidar com esses desafios"
            />
          </div>
          <div className="grid gap-2">
            <Label>Cor dos destaques</Label>
            <div className="flex flex-wrap gap-2">
              {corOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("cor", opt.value)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    (d.cor as string) === opt.value || (!d.cor && opt.value === "green")
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Cards de problemas (recomendado: 6 cards)</p>
          {items.map((item, i) => (
            <div key={i} className="rounded border border-muted-foreground/30 p-4 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>Dor {i + 1}</Label>
                {items.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => {
                      const next = items.filter((_, idx) => idx !== i);
                      update("items", next);
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
              <Input
                value={item.titulo ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], titulo: e.target.value };
                  update("items", next);
                }}
                placeholder="Título da dor (ex: Processos manuais)"
              />
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.descricao ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], descricao: e.target.value };
                  update("items", next);
                }}
                placeholder="Descrição breve do problema"
              />
              <div className="grid gap-1">
                <Label className="text-xs">Ícone</Label>
                <select
                  value={item.icone ?? "alert"}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], icone: e.target.value };
                    update("items", next);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {iconeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() =>
              update("items", [...items, { titulo: "", descricao: "", icone: "alert" }])
            }
          >
            + Adicionar dor
          </button>
        </div>
      );
    }

    case "produtos_alternados": {
      const items = (d.items as Array<{ titulo?: string; descricao?: string; image_url?: string; features?: string[] }>) ?? [];
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
      ];
      const bgTipoOptions = [
        { value: "cor", label: "Cor sólida" },
        { value: "imagem", label: "Imagem de fundo" },
      ];
      const bgCorOptions = [
        { value: "claro", label: "Claro (branco)", preview: "bg-slate-100" },
        { value: "cinza", label: "Cinza", preview: "bg-slate-300" },
        { value: "escuro", label: "Escuro", preview: "bg-slate-800" },
        { value: "azul_escuro", label: "Azul escuro", preview: "bg-blue-950" },
        { value: "verde_escuro", label: "Verde escuro", preview: "bg-emerald-950" },
      ];
      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Conheça Nossa Solução"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Solução"
            />
          </div>
          <div className="grid gap-2">
            <Label>Subtítulo (opcional)</Label>
            <Input
              value={(d.subtitulo as string) ?? ""}
              onChange={(e) => update("subtitulo", e.target.value)}
              placeholder="Ex: Tudo que você precisa para transformar seu negócio"
            />
          </div>

          {/* Background */}
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Background da seção</Label>
            <div className="flex gap-2">
              {bgTipoOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("bg_tipo", opt.value)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    (d.bg_tipo as string) === opt.value || (!d.bg_tipo && opt.value === "cor")
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {(d.bg_tipo as string) !== "imagem" ? (
              <div className="grid gap-2">
                <Label className="text-xs">Cor de fundo</Label>
                <div className="flex flex-wrap gap-2">
                  {bgCorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("bg_cor", opt.value)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                        (d.bg_cor as string) === opt.value || (!d.bg_cor && opt.value === "claro")
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : propostaId ? (
              <ImageUpload
                propostaId={propostaId}
                value={(d.bg_image_url as string) ?? ""}
                onChange={(url) => update("bg_image_url", url)}
                label="Imagem de fundo"
              />
            ) : (
              <div className="grid gap-2">
                <Label className="text-xs">URL da imagem de fundo</Label>
                <Input
                  value={(d.bg_image_url as string) ?? ""}
                  onChange={(e) => update("bg_image_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Cor dos destaques</Label>
            <div className="flex flex-wrap gap-2">
              {corOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("cor", opt.value)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    (d.cor as string) === opt.value || (!d.cor && opt.value === "cyan")
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Produtos/módulos (layout alterna: imagem esquerda, depois direita...)
          </p>
          {items.map((item, i) => (
            <div key={i} className="rounded border border-cyan-500/30 p-4 space-y-3 bg-cyan-500/5">
              <div className="flex items-center justify-between">
                <Label>Produto {i + 1} {i % 2 === 0 ? "(imagem à esquerda)" : "(imagem à direita)"}</Label>
                {items.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => {
                      const next = items.filter((_, idx) => idx !== i);
                      update("items", next);
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
              <Input
                value={item.titulo ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], titulo: e.target.value };
                  update("items", next);
                }}
                placeholder="Nome do produto/módulo"
              />
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={item.descricao ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], descricao: e.target.value };
                  update("items", next);
                }}
                placeholder="Descrição detalhada do produto/módulo"
              />
              {propostaId ? (
                <ImageUpload
                  propostaId={propostaId}
                  value={item.image_url ?? ""}
                  onChange={(url) => {
                    const next = [...items];
                    next[i] = { ...next[i], image_url: url };
                    update("items", next);
                  }}
                  label="Imagem / Screenshot do produto"
                />
              ) : (
                <div className="grid gap-2">
                  <Label className="text-xs">URL da imagem</Label>
                  <Input
                    value={item.image_url ?? ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], image_url: e.target.value };
                      update("items", next);
                    }}
                    placeholder="https://..."
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label className="text-xs">Features / Destaques (um por linha)</Label>
                {(item.features ?? []).map((feat, fIdx) => (
                  <div key={fIdx} className="flex gap-2">
                    <Input
                      value={feat}
                      onChange={(e) => {
                        const next = [...items];
                        const newFeatures = [...(next[i].features ?? [])];
                        newFeatures[fIdx] = e.target.value;
                        next[i] = { ...next[i], features: newFeatures };
                        update("items", next);
                      }}
                      placeholder={`Feature ${fIdx + 1}`}
                    />
                    <button
                      type="button"
                      className="text-xs text-destructive px-2"
                      onClick={() => {
                        const next = [...items];
                        const newFeatures = (next[i].features ?? []).filter((_, idx) => idx !== fIdx);
                        next[i] = { ...next[i], features: newFeatures };
                        update("items", next);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={() => {
                    const next = [...items];
                    next[i] = { ...next[i], features: [...(next[i].features ?? []), ""] };
                    update("items", next);
                  }}
                >
                  + Adicionar feature
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() =>
              update("items", [...items, { titulo: "", descricao: "", image_url: "", features: [] }])
            }
          >
            + Adicionar produto
          </button>
        </div>
      );
    }

    case "time": {
      const items =
        (d.items as Array<{ nome?: string; instagram?: string; funcao?: string; foto_url?: string }>) ?? [];
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
        { value: "yellow", label: "Amarelo", preview: "bg-yellow-500" },
        { value: "red", label: "Vermelho", preview: "bg-red-500" },
      ];
      const bgTipoOptions = [
        { value: "cor", label: "Cor sólida" },
        { value: "imagem", label: "Imagem de fundo" },
      ];
      const bgCorOptions = [
        { value: "claro", label: "Claro (branco)", preview: "bg-slate-100" },
        { value: "cinza", label: "Cinza", preview: "bg-slate-300" },
        { value: "escuro", label: "Escuro", preview: "bg-slate-800" },
        { value: "azul_escuro", label: "Azul escuro", preview: "bg-blue-950" },
        { value: "verde_escuro", label: "Verde escuro", preview: "bg-emerald-950" },
      ];

      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Nosso Time"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Time"
            />
          </div>
          <div className="grid gap-2">
            <Label>Subtítulo (opcional)</Label>
            <Input
              value={(d.subtitulo as string) ?? ""}
              onChange={(e) => update("subtitulo", e.target.value)}
              placeholder="Ex: Especialistas focados em resultado e execução."
            />
          </div>

          {/* Background */}
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Background da seção</Label>
            <div className="flex gap-2">
              {bgTipoOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("bg_tipo", opt.value)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    (d.bg_tipo as string) === opt.value || (!d.bg_tipo && opt.value === "cor")
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {(d.bg_tipo as string) !== "imagem" ? (
              <div className="grid gap-2">
                <Label className="text-xs">Cor de fundo</Label>
                <div className="flex flex-wrap gap-2">
                  {bgCorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("bg_cor", opt.value)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                        (d.bg_cor as string) === opt.value || (!d.bg_cor && opt.value === "claro")
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : propostaId ? (
              <ImageUpload
                propostaId={propostaId}
                value={(d.bg_image_url as string) ?? ""}
                onChange={(url) => update("bg_image_url", url)}
                label="Imagem de fundo"
              />
            ) : (
              <div className="grid gap-2">
                <Label className="text-xs">URL da imagem de fundo</Label>
                <Input
                  value={(d.bg_image_url as string) ?? ""}
                  onChange={(e) => update("bg_image_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>

          {/* Cor de destaque */}
          <div className="grid gap-2">
            <Label>Cor do destaque</Label>
            <div className="flex flex-wrap gap-2">
              {corOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("cor", opt.value)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                    (d.cor as string) === opt.value || (!d.cor && opt.value === "cyan")
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Membros do time (foto, nome e função)
          </p>
          {items.map((item, i) => (
            <div key={i} className="rounded border p-4 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>Membro {i + 1}</Label>
                {items.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => {
                      const next = items.filter((_, idx) => idx !== i);
                      update("items", next);
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
              <Input
                value={item.nome ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], nome: e.target.value };
                  update("items", next);
                }}
                placeholder="Nome"
              />
              <Input
                value={item.instagram ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], instagram: e.target.value };
                  update("items", next);
                }}
                placeholder="@instagram (opcional)"
              />
              <Input
                value={item.funcao ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], funcao: e.target.value };
                  update("items", next);
                }}
                placeholder="Função (ex: CEO / Founder)"
              />

              {propostaId ? (
                <ImageUpload
                  propostaId={propostaId}
                  value={item.foto_url ?? ""}
                  onChange={(url) => {
                    const next = [...items];
                    next[i] = { ...next[i], foto_url: url };
                    update("items", next);
                  }}
                  label="Foto"
                />
              ) : (
                <div className="grid gap-2">
                  <Label className="text-xs">URL da foto</Label>
                  <Input
                    value={item.foto_url ?? ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], foto_url: e.target.value };
                      update("items", next);
                    }}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() =>
              update("items", [...items, { nome: "", instagram: "", funcao: "", foto_url: "" }])
            }
          >
            + Adicionar membro
          </button>
        </div>
      );
    }

    case "garantia": {
      const itens = (d.itens as string[]) ?? [];
      const corOptions = [
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
        { value: "yellow", label: "Amarelo", preview: "bg-yellow-500" },
        { value: "red", label: "Vermelho", preview: "bg-red-500" },
      ];
      const bgTipoOptions = [
        { value: "cor", label: "Cor sólida" },
        { value: "imagem", label: "Imagem de fundo" },
      ];
      const bgCorOptions = [
        { value: "escuro", label: "Escuro", preview: "bg-slate-800" },
        { value: "azul_escuro", label: "Azul escuro", preview: "bg-blue-950" },
        { value: "verde_escuro", label: "Verde escuro", preview: "bg-emerald-950" },
        { value: "claro", label: "Claro", preview: "bg-slate-100" },
        { value: "cinza", label: "Cinza", preview: "bg-slate-300" },
      ];

      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Garantia total, risco zero"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: risco zero"
            />
          </div>
          <div className="grid gap-2">
            <Label>Subtítulo</Label>
            <Input
              value={(d.subtitulo as string) ?? ""}
              onChange={(e) => update("subtitulo", e.target.value)}
              placeholder="Ex: Se em até 7 dias você não perceber valor real..."
            />
          </div>

          <div className="grid gap-2">
            <Label>Prazo (dias)</Label>
            <Input
              value={(d.prazo_dias as number | string) ?? ""}
              onChange={(e) => update("prazo_dias", e.target.value)}
              placeholder="7"
            />
          </div>

          <div className="grid gap-2">
            <Label>Título do selo</Label>
            <Input
              value={(d.selo_titulo as string) ?? ""}
              onChange={(e) => update("selo_titulo", e.target.value)}
              placeholder="Garantia incondicional"
            />
          </div>
          <div className="grid gap-2">
            <Label>Subtítulo do selo</Label>
            <Input
              value={(d.selo_subtitulo as string) ?? ""}
              onChange={(e) => update("selo_subtitulo", e.target.value)}
              placeholder="7 dias para testar"
            />
          </div>

          <div className="grid gap-2">
            <Label>Texto</Label>
            <textarea
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={(d.texto as string) ?? ""}
              onChange={(e) => update("texto", e.target.value)}
              placeholder="Explique a garantia de um jeito simples..."
            />
          </div>

          {/* Background */}
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Background da seção</Label>
            <div className="flex gap-2">
              {bgTipoOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("bg_tipo", opt.value)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    (d.bg_tipo as string) === opt.value || (!d.bg_tipo && opt.value === "cor")
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {(d.bg_tipo as string) !== "imagem" ? (
              <div className="grid gap-2">
                <Label className="text-xs">Cor de fundo</Label>
                <div className="flex flex-wrap gap-2">
                  {bgCorOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("bg_cor", opt.value)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                        (d.bg_cor as string) === opt.value || (!d.bg_cor && opt.value === "escuro")
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : propostaId ? (
              <ImageUpload
                propostaId={propostaId}
                value={(d.bg_image_url as string) ?? ""}
                onChange={(url) => update("bg_image_url", url)}
                label="Imagem de fundo"
              />
            ) : (
              <div className="grid gap-2">
                <Label className="text-xs">URL da imagem de fundo</Label>
                <Input
                  value={(d.bg_image_url as string) ?? ""}
                  onChange={(e) => update("bg_image_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
          </div>

          {/* Cor de destaque */}
          <div className="grid gap-2">
            <Label>Cor do destaque</Label>
            <div className="flex flex-wrap gap-2">
              {corOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("cor", opt.value)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                    (d.cor as string) === opt.value || (!d.cor && opt.value === "green")
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de itens */}
          <div className="grid gap-2">
            <Label>Itens (um por linha)</Label>
            {itens.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={s}
                  onChange={(e) => {
                    const next = [...itens];
                    next[i] = e.target.value;
                    update("itens", next);
                  }}
                  placeholder={`Item ${i + 1}`}
                />
                <button
                  type="button"
                  className="text-xs text-destructive px-2"
                  onClick={() => {
                    const next = itens.filter((_, idx) => idx !== i);
                    update("itens", next);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() => update("itens", [...itens, ""])}
            >
              + Adicionar item
            </button>
          </div>

          {/* CTA */}
          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">CTA (opcional)</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Texto do botão</Label>
              <Input
                value={(d.cta_texto as string) ?? ""}
                onChange={(e) => update("cta_texto", e.target.value)}
                placeholder="Ex: Quero começar sem risco"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">URL do botão</Label>
              <Input
                value={(d.cta_url as string) ?? ""}
                onChange={(e) => update("cta_url", e.target.value)}
                placeholder="#oferta ou https://..."
              />
            </div>
          </div>
        </div>
      );
    }

    case "proximos_passos": {
      const passos = (d.passos as Array<{ numero?: number; titulo?: string; descricao?: string; icone?: string }>) ?? [];
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
      ];
      const bgCorOptions = [
        { value: "escuro", label: "Escuro", preview: "bg-slate-800" },
        { value: "claro", label: "Claro", preview: "bg-slate-100" },
      ];
      const iconeOptions = [
        { value: "file-check", label: "Documento" },
        { value: "rocket", label: "Foguete" },
        { value: "code", label: "Código" },
        { value: "graduation-cap", label: "Formatura" },
        { value: "check-circle", label: "Check" },
        { value: "settings", label: "Configurações" },
        { value: "users", label: "Pessoas" },
        { value: "zap", label: "Raio" },
      ];

      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Próximos Passos"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Passos"
            />
          </div>
          <div className="grid gap-2">
            <Label>Subtítulo (opcional)</Label>
            <Input
              value={(d.subtitulo as string) ?? ""}
              onChange={(e) => update("subtitulo", e.target.value)}
              placeholder="Ex: Veja como é simples começar"
            />
          </div>

          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Aparência</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Cor de fundo</Label>
              <div className="flex flex-wrap gap-2">
                {bgCorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("bg_cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.bg_cor as string) === opt.value || (!d.bg_cor && opt.value === "escuro")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Cor do destaque</Label>
              <div className="flex flex-wrap gap-2">
                {corOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.cor as string) === opt.value || (!d.cor && opt.value === "cyan")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Passos do processo (recomendado: 4 passos)</p>
          {passos.map((passo, i) => (
            <div key={i} className="rounded border p-4 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>Passo {i + 1}</Label>
                {passos.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => {
                      const next = passos.filter((_, idx) => idx !== i);
                      update("passos", next);
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
              <Input
                value={passo.titulo ?? ""}
                onChange={(e) => {
                  const next = [...passos];
                  next[i] = { ...next[i], titulo: e.target.value };
                  update("passos", next);
                }}
                placeholder="Título do passo"
              />
              <Input
                value={passo.descricao ?? ""}
                onChange={(e) => {
                  const next = [...passos];
                  next[i] = { ...next[i], descricao: e.target.value };
                  update("passos", next);
                }}
                placeholder="Descrição breve"
              />
              <select
                value={passo.icone ?? "check-circle"}
                onChange={(e) => {
                  const next = [...passos];
                  next[i] = { ...next[i], icone: e.target.value };
                  update("passos", next);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {iconeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() =>
              update("passos", [...passos, { numero: passos.length + 1, titulo: "", descricao: "", icone: "check-circle" }])
            }
          >
            + Adicionar passo
          </button>
        </div>
      );
    }

    case "resumo_proposta": {
      const itensInclusos = (d.itens_inclusos as string[]) ?? [];
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
      ];
      const bgCorOptions = [
        { value: "escuro", label: "Escuro", preview: "bg-slate-800" },
        { value: "claro", label: "Claro", preview: "bg-slate-100" },
      ];

      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Resumo da Proposta"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Proposta"
            />
          </div>

          <div className="rounded border p-3 space-y-3 bg-cyan-500/10">
            <Label className="text-sm font-medium">Valores</Label>
            <p className="text-xs text-muted-foreground">O valor parcelado aparece em destaque</p>
            <div className="grid gap-2">
              <Label className="text-xs font-medium">💳 Valor Parcelado (destaque principal)</Label>
              <Input
                value={(d.parcelas as string) ?? ""}
                onChange={(e) => update("parcelas", e.target.value)}
                placeholder="Ex: 12x de R$ 1.250"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">💰 Valor à Vista (menor, abaixo)</Label>
              <Input
                value={(d.valor_total as string) ?? ""}
                onChange={(e) => update("valor_total", e.target.value)}
                placeholder="Ex: R$ 15.000"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">⏱️ Prazo de Entrega</Label>
              <Input
                value={(d.prazo_entrega as string) ?? ""}
                onChange={(e) => update("prazo_entrega", e.target.value)}
                placeholder="Ex: 30 dias"
              />
            </div>
          </div>

          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Aparência</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Cor de fundo</Label>
              <div className="flex flex-wrap gap-2">
                {bgCorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("bg_cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.bg_cor as string) === opt.value || (!d.bg_cor && opt.value === "escuro")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Cor do destaque</Label>
              <div className="flex flex-wrap gap-2">
                {corOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.cor as string) === opt.value || (!d.cor && opt.value === "cyan")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>O que está incluso</Label>
            {itensInclusos.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const next = [...itensInclusos];
                    next[i] = e.target.value;
                    update("itens_inclusos", next);
                  }}
                  placeholder={`Item ${i + 1}`}
                />
                <button
                  type="button"
                  className="text-xs text-destructive px-2"
                  onClick={() => {
                    const next = itensInclusos.filter((_, idx) => idx !== i);
                    update("itens_inclusos", next);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() => update("itens_inclusos", [...itensInclusos, ""])}
            >
              + Adicionar item
            </button>
          </div>

          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">CTA</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Texto do botão</Label>
              <Input
                value={(d.cta_texto as string) ?? ""}
                onChange={(e) => update("cta_texto", e.target.value)}
                placeholder="Ex: Aprovar Proposta"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">URL do botão</Label>
              <Input
                value={(d.cta_url as string) ?? ""}
                onChange={(e) => update("cta_url", e.target.value)}
                placeholder="#contato ou https://..."
              />
            </div>
          </div>
        </div>
      );
    }

    case "diferenciais": {
      const items = (d.items as Array<{ icone?: string; titulo?: string; subtitulo?: string }>) ?? [];
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
      ];
      const bgCorOptions = [
        { value: "claro", label: "Claro", preview: "bg-slate-100" },
        { value: "escuro", label: "Escuro", preview: "bg-slate-800" },
      ];
      const iconeOptions = [
        { value: "award", label: "Troféu" },
        { value: "check-circle", label: "Check" },
        { value: "headphones", label: "Suporte" },
        { value: "zap", label: "Raio" },
        { value: "shield", label: "Escudo" },
        { value: "clock", label: "Relógio" },
        { value: "users", label: "Pessoas" },
        { value: "star", label: "Estrela" },
        { value: "heart", label: "Coração" },
        { value: "target", label: "Alvo" },
        { value: "rocket", label: "Foguete" },
        { value: "thumbs-up", label: "Joinha" },
      ];

      return (
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Título da seção</Label>
            <Input
              value={(d.titulo as string) ?? ""}
              onChange={(e) => update("titulo", e.target.value)}
              placeholder="Ex: Por Que Nos Escolher?"
            />
          </div>
          <div className="grid gap-2">
            <Label>Trecho em destaque no título</Label>
            <Input
              value={(d.titulo_highlight as string) ?? ""}
              onChange={(e) => update("titulo_highlight", e.target.value)}
              placeholder="Ex: Escolher"
            />
          </div>
          <div className="grid gap-2">
            <Label>Subtítulo (opcional)</Label>
            <Input
              value={(d.subtitulo as string) ?? ""}
              onChange={(e) => update("subtitulo", e.target.value)}
              placeholder="Ex: Conheça os diferenciais que fazem a diferença"
            />
          </div>

          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Aparência</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Cor de fundo</Label>
              <div className="flex flex-wrap gap-2">
                {bgCorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("bg_cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.bg_cor as string) === opt.value || (!d.bg_cor && opt.value === "claro")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Cor do destaque</Label>
              <div className="flex flex-wrap gap-2">
                {corOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.cor as string) === opt.value || (!d.cor && opt.value === "cyan")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Diferenciais (recomendado: 4 cards)</p>
          {items.map((item, i) => (
            <div key={i} className="rounded border p-4 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label>Diferencial {i + 1}</Label>
                {items.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => {
                      const next = items.filter((_, idx) => idx !== i);
                      update("items", next);
                    }}
                  >
                    Remover
                  </button>
                )}
              </div>
              <Input
                value={item.titulo ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], titulo: e.target.value };
                  update("items", next);
                }}
                placeholder="Número ou título (ex: +10 anos)"
              />
              <Input
                value={item.subtitulo ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], subtitulo: e.target.value };
                  update("items", next);
                }}
                placeholder="Descrição (ex: de experiência no mercado)"
              />
              <select
                value={item.icone ?? "award"}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], icone: e.target.value };
                  update("items", next);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {iconeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-primary"
            onClick={() => update("items", [...items, { icone: "award", titulo: "", subtitulo: "" }])}
          >
            + Adicionar diferencial
          </button>
        </div>
      );
    }

    case "rodape": {
      const corOptions = [
        { value: "cyan", label: "Ciano", preview: "bg-cyan-500" },
        { value: "green", label: "Verde", preview: "bg-green-500" },
        { value: "orange", label: "Laranja", preview: "bg-orange-500" },
        { value: "purple", label: "Roxo", preview: "bg-purple-500" },
        { value: "blue", label: "Azul", preview: "bg-blue-500" },
      ];
      const bgCorOptions = [
        { value: "escuro", label: "Escuro", preview: "bg-slate-900" },
        { value: "claro", label: "Claro", preview: "bg-slate-100" },
      ];

      return (
        <div className="space-y-4">
          <div className="rounded border p-3 space-y-3 bg-cyan-500/10">
            <Label className="text-sm font-medium">Identidade</Label>
            {propostaId ? (
              <ImageUpload
                propostaId={propostaId}
                value={(d.logo_url as string) ?? ""}
                onChange={(url) => update("logo_url", url)}
                label="Logo da empresa"
              />
            ) : (
              <div className="grid gap-2">
                <Label className="text-xs">URL da logo</Label>
                <Input
                  value={(d.logo_url as string) ?? ""}
                  onChange={(e) => update("logo_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label className="text-xs">Nome da empresa</Label>
              <Input
                value={(d.nome_empresa as string) ?? ""}
                onChange={(e) => update("nome_empresa", e.target.value)}
                placeholder="Sua Empresa"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Slogan (opcional)</Label>
              <Input
                value={(d.slogan as string) ?? ""}
                onChange={(e) => update("slogan", e.target.value)}
                placeholder="Transformando negócios com tecnologia"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">CNPJ (opcional)</Label>
              <Input
                value={(d.cnpj as string) ?? ""}
                onChange={(e) => update("cnpj", e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
          </div>

          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Contato</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Telefone</Label>
              <Input
                value={(d.telefone as string) ?? ""}
                onChange={(e) => update("telefone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Email</Label>
              <Input
                value={(d.email as string) ?? ""}
                onChange={(e) => update("email", e.target.value)}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">WhatsApp (número completo com DDI)</Label>
              <Input
                value={(d.whatsapp as string) ?? ""}
                onChange={(e) => update("whatsapp", e.target.value)}
                placeholder="5511999999999"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Endereço (opcional)</Label>
              <Input
                value={(d.endereco as string) ?? ""}
                onChange={(e) => update("endereco", e.target.value)}
                placeholder="São Paulo, SP - Brasil"
              />
            </div>
          </div>

          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Redes Sociais (opcional)</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Instagram</Label>
              <Input
                value={(d.instagram as string) ?? ""}
                onChange={(e) => update("instagram", e.target.value)}
                placeholder="@usuario ou https://instagram.com/usuario"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">LinkedIn</Label>
              <Input
                value={(d.linkedin as string) ?? ""}
                onChange={(e) => update("linkedin", e.target.value)}
                placeholder="nome-empresa ou https://linkedin.com/company/..."
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">YouTube</Label>
              <Input
                value={(d.youtube as string) ?? ""}
                onChange={(e) => update("youtube", e.target.value)}
                placeholder="@canal ou https://youtube.com/..."
              />
            </div>
          </div>

          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <Label className="text-sm font-medium">Aparência</Label>
            <div className="grid gap-2">
              <Label className="text-xs">Cor de fundo</Label>
              <div className="flex flex-wrap gap-2">
                {bgCorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("bg_cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.bg_cor as string) === opt.value || (!d.bg_cor && opt.value === "escuro")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full border ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Cor do destaque</Label>
              <div className="flex flex-wrap gap-2">
                {corOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("cor", opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                      (d.cor as string) === opt.value || (!d.cor && opt.value === "cyan")
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${opt.preview}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}
