"use client";

import { useEffect, useState } from "react";
import { Bell, MessageSquare, Send, CheckCircle2, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

type Member = {
  id: number;
  nome: string;
  email: string;
};

const PRESETS = [
  {
    key: "PENDING_CHECK",
    label: "Pendências na tarefa",
    message: "Verifique pendências em {taskName} na sua área.",
  },
  {
    key: "URGENT_UPDATE",
    label: "Atualização urgente",
    message: "Precisamos de uma atualização urgente sobre {taskName}.",
  },
  {
    key: "STATUS_TODAY",
    label: "Preciso de status hoje",
    message: "Por favor, envie o status de {taskName} até o final do dia.",
  },
];

interface CobrarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number;
  taskName: string;
}

export function CobrarModal({ open, onOpenChange, taskId, taskName }: CobrarModalProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("PENDING_CHECK");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const [dmRecipient, setDmRecipient] = useState<number | null>(null);
  const [dmContent, setDmContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadMembers();
      setSelectedMembers(new Set());
      setDmRecipient(null);
      setDmContent("");
      setError(null);
    }
  }, [open, taskId]);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await api<Member[]>(`/api/v1/tarefas/${taskId}/members`);
      setMembers(data);
      // Selecionar todos por padrão
      setSelectedMembers(new Set(data.map((m) => m.id)));
      if (data.length === 0) {
        console.warn("Nenhum membro encontrado na tarefa. Adicione um responsável ou assignees à tarefa.");
      }
    } catch (e) {
      console.error("Erro ao carregar membros:", e);
      const errorMessage = e instanceof Error ? e.message : "Erro desconhecido";
      if (errorMessage.includes("does not exist") || errorMessage.includes("tabela")) {
        alert("As tabelas de notificações ainda não foram criadas.\n\nExecute no backend:\nalembic upgrade head\npython -m app.seed");
      }
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleNudge() {
    if (selectedMembers.size === 0) {
      alert("Selecione pelo menos um membro");
      return;
    }

    setSending(true);
    try {
      const preset = PRESETS.find((p) => p.key === selectedPreset);
      const message = customMessage || preset?.message.replace("{taskName}", taskName) || "";

      await api(`/api/v1/tarefas/${taskId}/nudge`, {
        method: "POST",
        body: JSON.stringify({
          recipient_user_ids: Array.from(selectedMembers),
          preset: selectedPreset,
          custom_message: customMessage || undefined,
        }),
      });

      // Fechar modal imediatamente
      onOpenChange(false);
      
      // Mostrar notificação flutuante
      toast({
        variant: "success",
        title: "Notificação enviada",
        description: `${selectedMembers.size} notificação(ões) enviada(s) com sucesso.`,
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Erro ao enviar";
      console.error("Erro ao enviar cobrança:", e);
      setError(errorMessage);
      setTimeout(() => setError(null), 10000);
    } finally {
      setSending(false);
    }
  }

  async function handleSendDM(userId: number) {
    if (!dmContent.trim()) {
      alert("Digite uma mensagem");
      return;
    }

    setSending(true);
    try {
      await api("/api/v1/conversations/direct", {
        method: "POST",
        body: JSON.stringify({
          recipient_user_id: userId,
          first_message: dmContent,
        }),
      });

      // Fechar modal imediatamente
      onOpenChange(false);
      
      // Mostrar notificação flutuante
      toast({
        variant: "success",
        title: "Mensagem enviada",
        description: "Sua mensagem direta foi enviada com sucesso.",
      });
      
      setDmRecipient(null);
      setDmContent("");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Erro ao enviar mensagem";
      console.error("Erro ao enviar mensagem direta:", e);
      alert(`Erro: ${errorMessage}`);
    } finally {
      setSending(false);
    }
  }

  function toggleMember(userId: number) {
    const newSet = new Set(selectedMembers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedMembers(newSet);
  }

  const preset = PRESETS.find((p) => p.key === selectedPreset);
  const previewMessage = customMessage || preset?.message.replace("{taskName}", taskName) || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobrar membros da tarefa</DialogTitle>
          <DialogDescription>
            Envie notificações de cobrança ou mensagens diretas para membros envolvidos em{" "}
            <strong>{taskName}</strong>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm whitespace-pre-line">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setError(null)}
            >
              ×
            </Button>
          </div>
        )}

        {dmRecipient ? (
          <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDmRecipient(null);
                      setDmContent("");
                    }}
                  >
                    ← Voltar
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Mensagem direta para{" "}
                    {members.find((m) => m.id === dmRecipient)?.nome}
                  </span>
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={dmContent}
                    onChange={(e) => setDmContent(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    rows={4}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {dmContent.length}/2000 caracteres
                  </p>
                </div>
                <Button
                  onClick={() => handleSendDM(dmRecipient)}
                  disabled={sending || !dmContent.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar mensagem
                </Button>
          </div>
        ) : (
          <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template de cobrança</Label>
                  <div className="grid gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setSelectedPreset(p.key)}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          selectedPreset === p.key
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-medium text-sm">{p.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {p.message.replace("{taskName}", taskName)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem personalizada (opcional)</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Deixe vazio para usar o template selecionado"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Membros da tarefa</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedMembers.size === members.length) {
                          setSelectedMembers(new Set());
                        } else {
                          setSelectedMembers(new Set(members.map((m) => m.id)));
                        }
                      }}
                    >
                      {selectedMembers.size === members.length ? "Desmarcar todos" : "Selecionar todos"}
                    </Button>
                  </div>
                  {loading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Carregando membros...
                    </div>
                  ) : members.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum membro encontrado nesta tarefa</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {members.map((member) => (
                        <Card key={member.id} className="border-border/80">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                                  <User className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{member.nome}</p>
                                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  variant={selectedMembers.has(member.id) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleMember(member.id)}
                                  className="h-8"
                                >
                                  <Bell className="h-3.5 w-3.5 mr-1" />
                                  Cobrar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDmRecipient(member.id)}
                                  className="h-8"
                                >
                                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                  DM
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {selectedMembers.size > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Preview da mensagem:</p>
                    <p className="text-sm text-muted-foreground">{previewMessage}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Será enviada para {selectedMembers.size} membro(s)
                    </p>
                  </div>
                )}
          </div>
        )}

        <DialogFooter>
          {!dmRecipient && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleNudge}
                disabled={sending || selectedMembers.size === 0}
              >
                <Bell className="h-4 w-4 mr-2" />
                Enviar cobrança ({selectedMembers.size})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

