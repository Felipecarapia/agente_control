"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Bell,
  Check,
  CheckCheck,
  Archive,
  Pin,
  PinOff,
  Search,
  Filter,
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { retryWithBackoff } from "@/lib/retry";

type NotificationItem = {
  id: string;
  notification_id: string;
  recipient_user_id: string;
  delivered_at: string;
  read_at: string | null;
  archived_at: string | null;
  pinned_at: string | null;
  muted: boolean;
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    priority: string;
    author_user_id: string | null;
    context_type: string | null;
    context_id: string | null;
    action_url: string | null;
    metadata: any;
    created_at: string;
  };
  author_name: string | null;
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-500",
  normal: "bg-gray-500/10 text-gray-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-red-500/10 text-red-500",
};

const TYPE_LABELS: Record<string, string> = {
  PROJECT_NUDGE: "Cobrança",
  DIRECT_MESSAGE: "Mensagem",
  SYSTEM: "Sistema",
  TASK_MENTION: "Menção",
  PROPOSAL_UPDATE: "Proposta",
  CONTRACT_UPDATE: "Contrato",
};

export default function NotificacoesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState("todas");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [activeTab, search]);

  async function loadUnreadCount() {
    try {
      const data = await retryWithBackoff(async () => {
        return await api<{ count: number }>("/api/v1/notifications/unread-count");
      });
      setUnreadCount(data?.count ?? 0);
    } catch (e) {
      // Silenciosamente falha se a tabela ainda não existir ou se houver erro de autenticação
      setUnreadCount(0);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        page_size: "50",
        unread_only: activeTab === "nao-lidas" ? "true" : "false",
      });
      if (search) params.append("search", search);

      const data = await retryWithBackoff(async () => {
        return await api<{
          items: NotificationItem[];
          total: number;
          page: number;
          page_size: number;
        }>(`/api/v1/notifications?${params}`);
      });
      
      // Filtrar por tab
      let filtered = Array.isArray(data?.items) ? data.items : [];
      if (activeTab === "fixadas") {
        filtered = filtered.filter((n) => n.pinned_at);
      } else if (activeTab === "arquivadas") {
        filtered = filtered.filter((n) => n.archived_at);
      } else if (activeTab === "nao-lidas") {
        filtered = filtered.filter((n) => !n.read_at);
      }

      setNotifications(filtered);
    } catch (e) {
      // Silenciosamente falha se a tabela ainda não existir ou se houver erro de autenticação
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(recipientId: number) {
    try {
      await api("/api/v1/notifications/read", {
        method: "POST",
        body: JSON.stringify({ recipient_ids: [recipientId] }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === recipientId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      loadUnreadCount();
    } catch (e) {
      // Silenciar erro - não quebrar UX
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications
      .filter((n) => !n.read_at)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      await api("/api/v1/notifications/read", {
        method: "POST",
        body: JSON.stringify({ recipient_ids: unreadIds }),
      });
      loadNotifications();
      loadUnreadCount();
    } catch (e) {
      // Silenciar erro - não quebrar UX
    }
  }

  async function togglePin(recipientId: number) {
    try {
      const data = await api<{ pinned: boolean }>(
        `/api/v1/notifications/pin/${recipientId}`,
        { method: "POST" }
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === recipientId
            ? { ...n, pinned_at: data.pinned ? new Date().toISOString() : null }
            : n
        )
      );
    } catch (e) {
      // Silenciar erro - não quebrar UX
    }
  }

  async function archive(recipientId: number) {
    try {
      await api("/api/v1/notifications/archive", {
        method: "POST",
        body: JSON.stringify({ recipient_ids: [recipientId] }),
      });
      loadNotifications();
    } catch (e) {
      // Silenciar erro - não quebrar UX
    }
  }

  function handleNotificationClick(item: NotificationItem) {
    if (!item.read_at) {
      markAsRead(item.id);
    }
    if (item.notification.action_url) {
      router.push(item.notification.action_url);
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-BR");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 lg:space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">Notificações</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Gerencie suas notificações e mensagens
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} size="sm" className="lg:size-default">
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="nao-lidas">
                Não lidas {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="fixadas">Fixadas</TabsTrigger>
              <TabsTrigger value="arquivadas">Arquivadas</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Carregando...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma notificação encontrada</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 hover:bg-muted/50 transition-colors ${
                        !item.read_at ? "bg-muted/30" : ""
                      } ${item.pinned_at ? "border-l-4 border-l-primary" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{item.notification.title}</h3>
                            {!item.read_at && (
                              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0"></span>
                            )}
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                PRIORITY_COLORS[item.notification.priority] || PRIORITY_COLORS.normal
                              }`}
                            >
                              {item.notification.priority}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {TYPE_LABELS[item.notification.type] || item.notification.type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {item.notification.body}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTime(item.delivered_at)}</span>
                            {item.author_name && (
                              <>
                                <span>•</span>
                                <span>{item.author_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {!item.read_at && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markAsRead(item.id)}
                              title="Marcar como lida"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => togglePin(item.id)}
                            title={item.pinned_at ? "Desfixar" : "Fixar"}
                          >
                            {item.pinned_at ? (
                              <PinOff className="h-4 w-4" />
                            ) : (
                              <Pin className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => archive(item.id)}
                            title="Arquivar"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          {item.notification.action_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleNotificationClick(item)}
                              title="Abrir"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

