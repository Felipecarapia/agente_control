"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, AtSign } from "lucide-react";

type TaskComment = {
  id: number;
  content: string;
  author_user_id: number | null;
  author_nome: string | null;
  created_at: string;
};

interface TaskCommentsProps {
  taskId: number;
  comments: TaskComment[];
  usuarios: Array<{ id: number; nome: string }>;
  onCommentAdded: () => void;
}

export function TaskComments({
  taskId,
  comments,
  usuarios,
  onCommentAdded,
}: TaskCommentsProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMentions, setShowMentions] = useState(false);

  async function addComment() {
    if (!content.trim()) return;

    setSaving(true);
    try {
      // Detectar menções (@nome)
      const mentionRegex = /@(\w+)/g;
      const matches = content.match(mentionRegex);
      const mentionedUserIds: number[] = [];

      if (matches) {
        matches.forEach((match) => {
          const username = match.substring(1);
          const user = usuarios.find(
            (u) => u.nome.toLowerCase() === username.toLowerCase()
          );
          if (user) {
            mentionedUserIds.push(user.id);
          }
        });
      }

      await api(`/api/v1/task-notion/comments`, {
        method: "POST",
        body: JSON.stringify({
          task_id: taskId,
          content: content.trim(),
          mentioned_user_ids: mentionedUserIds,
        }),
      });

      setContent("");
      onCommentAdded();
    } catch (e) {
      console.error("Erro ao adicionar comentário:", e);
      alert("Erro ao adicionar comentário");
    } finally {
      setSaving(false);
    }
  }

  function getInitials(nome: string | null): string {
    if (!nome) return "?";
    return nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  return (
    <div className="space-y-4">
      {/* Lista de comentários */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getInitials(comment.author_nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {comment.author_nome || "Usuário"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), "dd MMM yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Formulário de novo comentário */}
      <div className="space-y-2 border-t pt-4">
        <Textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (e.target.value.includes("@")) {
              setShowMentions(true);
            } else {
              setShowMentions(false);
            }
          }}
          placeholder="Adicione um comentário... (use @ para mencionar)"
          rows={3}
        />
        {showMentions && (
          <div className="border rounded-lg p-2 space-y-1 bg-background shadow-lg max-h-32 overflow-y-auto">
            {usuarios.map((user) => (
              <button
                key={user.id}
                className="w-full text-left px-2 py-1 hover:bg-muted rounded text-sm"
                onClick={() => {
                  setContent((prev) => {
                    const lastAt = prev.lastIndexOf("@");
                    if (lastAt !== -1) {
                      return (
                        prev.substring(0, lastAt) +
                        `@${user.nome} ` +
                        prev.substring(prev.indexOf(" ", lastAt) + 1)
                      );
                    }
                    return prev + `@${user.nome} `;
                  });
                  setShowMentions(false);
                }}
              >
                <AtSign className="h-3 w-3 inline mr-1" />
                {user.nome}
              </button>
            ))}
          </div>
        )}
        <Button onClick={addComment} disabled={saving || !content.trim()} size="sm">
          <Send className="h-4 w-4 mr-2" />
          {saving ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  );
}




