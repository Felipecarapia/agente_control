"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Archive, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { retryWithBackoff } from "@/lib/retry";
import Link from "next/link";

type NotificationItem = {
  id: number;
  notification_id: string;
  recipient_user_id: number;
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
    author_user_id: number | null;
    context_type: string | null;
    context_id: string | null;
    action_url: string | null;
    metadata: any;
    created_at: string;
  };
  author_name: string | null;
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollingEnabledRef = useRef(true);

  useEffect(() => {
    // Delay inicial para não bloquear render
    const initialTimer = setTimeout(() => {
      loadUnreadCount();
      loadNotifications();
    }, 200);

    // Polling a cada 30s (fallback se SSE não funcionar)
    // Com retry e backoff, e para em 401/403
    const interval = setInterval(() => {
      if (!pollingEnabledRef.current) {
        return; // Parar polling se desabilitado (401/403)
      }
      loadUnreadCount().catch((e) => {
        // Se for 401/403, parar polling permanentemente
        if (e?.status === 401 || e?.status === 403 || e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
          pollingEnabledRef.current = false;
        }
        // Silenciar outros erros no polling
      });
    }, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  async function loadUnreadCount() {
    try {
      const data = await retryWithBackoff(async () => {
        return await api<{ count: number }>("/api/v1/notifications/unread-count");
      });
      // apiClient já extrai data do formato {ok: true, data: {...}}
      setUnreadCount(data?.count ?? 0);
    } catch (e: any) {
      // Se for 401/403, parar polling
      if (e?.status === 401 || e?.status === 403 || e?.code === "UNAUTHORIZED" || e?.code === "FORBIDDEN") {
        pollingEnabledRef.current = false;
      }
      // Silenciosamente falha se a tabela ainda não existir ou se houver erro de autenticação
      // Não quebra a aplicação
      setUnreadCount(0);
    }
  }

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await api<{
        items: NotificationItem[];
        total: number;
        page: number;
        page_size: number;
      }>("/api/v1/notifications?page=1&page_size=10&unread_only=false");
      // apiClient já extrai data do formato {ok: true, data: {...}}
      setNotifications(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      // Silenciosamente falha se a tabela ainda não existir ou se houver erro de autenticação
      // Não quebra a aplicação
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
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      loadUnreadCount();
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
      setOpen(false);
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
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("pt-BR");
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground"
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-card shadow-xl z-50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notificações</h3>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Marcar todas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                asChild
              >
                <Link href="/dashboard/notificacoes">Ver todas</Link>
              </Button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !item.read_at ? "bg-muted/30" : ""
                    }`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">{item.notification.title}</p>
                          {!item.read_at && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0"></span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.notification.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(item.delivered_at)}
                          </span>
                          {item.author_name && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{item.author_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

