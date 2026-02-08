"use client";

import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onUploadComplete: (newAvatarUrl: string) => void;
  onRemove?: () => void;
}

export function AvatarUpload({
  currentAvatarUrl,
  onUploadComplete,
  onRemove,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    // Validar tipo
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 2MB");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

      const res = await fetch(`${API_URL}/api/v1/profile/me/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erro ao fazer upload");
      }

      const data = await res.json();
      // Manter preview até que a página seja recarregada ou o perfil seja atualizado
      // onUploadComplete atualiza o estado do perfil
      onUploadComplete(data.avatar_url);
      // Não limpar preview imediatamente - deixar visível até recarregar
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Deseja remover sua foto de perfil?")) return;

    setUploading(true);
    setError(null);

    try {
      await api("/api/v1/profile/me/avatar", { method: "DELETE" });
      onUploadComplete("");
      if (onRemove) onRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover avatar");
    } finally {
      setUploading(false);
    }
  };

  // Construir URL do avatar corretamente
  // Se começar com /uploads, usar proxy do Next.js (sem API_URL)
  // Se for URL completa, usar direto
  const avatarUrl = preview 
    ? preview 
    : currentAvatarUrl 
      ? currentAvatarUrl  // Next.js faz proxy via rewrite para /uploads/*
      : "https://i.imgur.com/PrOd6nf.png";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div
          className={`relative w-24 h-24 rounded-full overflow-hidden border-2 ${
            dragActive ? "border-primary" : "border-border"
          } transition-colors`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Image
            src={avatarUrl}
            alt="Avatar"
            width={96}
            height={96}
            className="w-full h-full object-cover"
            unoptimized
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div
            className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
            <div className="text-center">
              <Upload className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">
                Arraste uma imagem ou{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline"
                  disabled={uploading}
                >
                  clique para selecionar
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WEBP (máx. 2MB)
              </p>
            </div>
          </div>

          {currentAvatarUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Remover foto
            </Button>
          )}
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}

