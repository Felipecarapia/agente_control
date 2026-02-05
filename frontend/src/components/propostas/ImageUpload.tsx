"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { API_URL, uploadPropostaImage } from "@/lib/api";
import { Upload, X } from "lucide-react";

type Props = {
  propostaId: number;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
};

export function ImageUpload({ propostaId, value, onChange, label = "Imagem", className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadPropostaImage(propostaId, file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const fullUrl = value ? (value.startsWith("http") ? value : `${API_URL}${value}`) : null;

  return (
    <div className={className}>
      {label && <Label className="block mb-1">{label}</Label>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Enviando..." : "Enviar imagem"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="gap-2 text-destructive"
          >
            <X className="h-4 w-4" />
            Remover
          </Button>
        )}
      </div>
      {fullUrl && (
        <div className="mt-2 rounded border overflow-hidden max-w-[200px]">
          <img src={fullUrl} alt="Preview" className="w-full h-auto object-cover" />
        </div>
      )}
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      {value && !fullUrl && <p className="text-xs text-muted-foreground mt-1 truncate">{value}</p>}
    </div>
  );
}
