"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { MessageSquare, Send, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

type Message = {
  id: string;
  conversation_id: string;
  author_user_id: number | null;
  content: string;
  created_at: string;
  edited_at: string | null;
  author_name: string | null;
};

type Conversation = {
  id: string;
  kind: string;
  created_at: string;
  other_participant_name: string | null;
  other_participant_id: number | null;
  last_message: Message | null;
  unread_count: number;
};

export default function MensagensPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      // Polling para novas mensagens
      const interval = setInterval(() => {
        loadMessages(selectedConversation);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function loadConversations() {
    setLoading(true);
    try {
      const data = await api<{
        items: Conversation[];
        total: number;
        page: number;
        page_size: number;
      }>("/api/v1/conversations?page=1&page_size=50");
      setConversations(data.items);
      if (data.items.length > 0 && !selectedConversation) {
        setSelectedConversation(data.items[0].id);
      }
    } catch (e) {
      console.error("Erro ao carregar conversas:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    try {
      const data = await api<{
        id: string;
        kind: string;
        created_at: string;
        participants: any[];
        messages: Message[];
      }>(`/api/v1/conversations/${conversationId}?limit=100`);
      setMessages(data.messages);
    } catch (e) {
      console.error("Erro ao carregar mensagens:", e);
    }
  }

  async function sendMessage() {
    if (!selectedConversation || !messageContent.trim()) return;

    setSending(true);
    try {
      const data = await api<Message>(`/api/v1/conversations/${selectedConversation}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: messageContent }),
      });
      setMessages((prev) => [...prev, data]);
      setMessageContent("");
      loadConversations(); // Atualizar lista
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  const currentConversation = conversations.find((c) => c.id === selectedConversation);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-8rem)] flex flex-col"
    >
      <div className="mb-4">
        <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">Mensagens Diretas</h1>
        <p className="text-sm lg:text-base text-muted-foreground">
          Converse com membros da equipe
        </p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Lista de conversas */}
        <Card className="w-80 flex-shrink-0 flex flex-col">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conversa</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                        selectedConversation === conv.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {conv.other_participant_name || "Usuário"}
                            </p>
                            {conv.unread_count > 0 && (
                              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">
                                {conv.unread_count > 9 ? "9+" : conv.unread_count}
                              </span>
                            )}
                          </div>
                          {conv.last_message && (
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Área de chat */}
        <Card className="flex-1 flex flex-col min-w-0">
          <CardContent className="p-0 flex flex-col h-full">
            {selectedConversation && currentConversation ? (
              <>
                {/* Header do chat */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {currentConversation.other_participant_name || "Usuário"}
                    </p>
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => {
                    // TODO: Obter current_user_id do contexto/auth
                    // Por enquanto, assumimos que mensagens com author_user_id são do usuário atual
                    const isOwn = msg.author_user_id !== null;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {!isOwn && msg.author_name && (
                            <p className="text-xs font-medium mb-1 opacity-80">
                              {msg.author_name}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input de mensagem */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                      rows={2}
                      maxLength={2000}
                      className="resize-none"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={sending || !messageContent.trim()}
                      size="icon"
                      className="h-auto"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {messageContent.length}/2000 caracteres
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma conversa para começar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}

