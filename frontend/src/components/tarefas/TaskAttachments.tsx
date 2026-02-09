"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Paperclip, Download, Trash2, File } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type TaskAttachment = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  url: string | null;
  created_at: string;
};

interface TaskAttachmentsProps {
  taskId: string;
  attachments: TaskAttachment[];
  onUploadComplete: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({
  taskId,
  attachments,
  onUploadComplete,
}: TaskAttachmentsProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/v1/task-notion/tasks/${taskId}/attachments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao fazer upload");
      }

      onUploadComplete();
      e.target.value = ""; // Reset input
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao fazer upload do arquivo");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAttachment(attachmentId: string) {
    if (!confirm("Deseja excluir este anexo?")) return;

    try {
      await api(`/api/v1/task-notion/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      onUploadComplete();
    } catch (error) {
      console.error("Erro ao excluir anexo:", error);
      alert("Erro ao excluir anexo");
    }
  }

  return (
    <div className="space-y-4">
      {/* Lista de anexos */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size_bytes)} •{" "}
                    {format(new Date(attachment.created_at), "dd MMM yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {attachment.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(attachment.url!, "_blank")}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteAttachment(attachment.id)}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload */}
      <div>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => document.getElementById("file-upload")?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          {uploading ? "Enviando..." : "Anexar arquivo"}
        </Button>
      </div>
    </div>
  );
}




