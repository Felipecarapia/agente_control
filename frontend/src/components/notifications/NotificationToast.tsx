"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MessageSquare, Bell } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { retryWithBackoff } from "@/lib/retry";

interface NotificationToastData {
  id: string;
  type: "notification" | "message";
  title: string;
  body: string;
  authorAvatar?: string | null;
  authorName?: string;
  actionUrl?: string;
  conversationId?: number;
}

interface NotificationToastProps {
  notification: NotificationToastData;
  onDismiss: (id: string) => void;
  onView: (id: string) => void;
}

function NotificationToastItem({
  notification,
  onDismiss,
  onView,
}: NotificationToastProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(notification.id), 300);
    }, 6000);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  function handleView() {
    if (notification.type === "message" && notification.conversationId) {
      router.push(`/dashboard/mensagens?conversation=${notification.conversationId}`);
    } else if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    onView(notification.id);
    setVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  }

  const avatarUrl = notification.authorAvatar || "https://i.imgur.com/PrOd6nf.png";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 z-[10000] w-full max-w-sm"
        >
          <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                <Image
                  src={avatarUrl}
                  alt={notification.authorName || "Usuário"}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  {notification.type === "message" ? (
                    <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <Bell className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                  <p className="text-sm font-semibold truncate">
                    {notification.authorName || "Sistema"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setVisible(false);
                    setTimeout(() => onDismiss(notification.id), 300);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {notification.body}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleView}
                  className="h-7 text-xs"
                >
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setVisible(false);
                    setTimeout(() => onDismiss(notification.id), 300);
                  }}
                  className="h-7 text-xs"
                >
                  Dispensar
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function NotificationToastManager() {
  const [notifications, setNotifications] = useState<NotificationToastData[]>([]);
  const [lastNotificationId, setLastNotificationId] = useState<number | null>(null);
  const pollingEnabledRef = useState(true)[0];

  useEffect(() => {
    // Polling leve a cada 20s para verificar novas notificações
    // Delay inicial para não bloquear render
    let isMounted = true;
    let pollingEnabled = true;
    
    const interval = setInterval(async () => {
      if (!isMounted || !pollingEnabled) return;
      
      try {
        // Verificar contagem de não lidas (com retry e backoff)
        const unreadCount = await retryWithBackoff(async () => {
          return await api<{ count: number }>(
            "/api/v1/notifications/unread-count"
          );
        });

        if (!isMounted) return;

        if (unreadCount?.count > 0) {
          // Buscar última notificação não lida (com retry e backoff)
          const recentData = await retryWithBackoff(async () => {
            return await api<{
              items: any[];
              total: number;
              page: number;
              page_size: number;
            }>("/api/v1/notifications?unread_only=true&page=1&page_size=1");
          });

          if (!isMounted) return;

          const recent = Array.isArray(recentData?.items) ? recentData.items : [];
          if (recent.length > 0) {
            const notif = recent[0];
            
            // Verificar se já mostramos esta notificação
            if (lastNotificationId !== notif.id) {
              setLastNotificationId(notif.id);
              
              const notificationId = `${notif.id}-${Date.now()}`;
              setNotifications((prev) => [
                ...prev,
                {
                  id: notificationId,
                  type: "notification",
                  title: notif.notification?.title || "Nova notificação",
                  body: notif.notification?.body || "",
                  authorAvatar: notif.author_name ? null : null, // TODO: adicionar avatar se disponível
                  authorName: notif.author_name,
                  actionUrl: notif.notification?.action_url,
                },
              ]);
            }
          }
        }
      } catch (err: any) {
        // Se for 401/403, parar polling permanentemente
        if (err?.status === 401 || err?.status === 403 || err?.code === "UNAUTHORIZED" || err?.code === "FORBIDDEN") {
          pollingEnabled = false;
        }
        // Silenciar outros erros de timeout/polling para não poluir console
      }
    }, 20000); // 20 segundos

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lastNotificationId]);

  function handleDismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  function handleView(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="fixed top-4 right-4 z-[10000] space-y-2">
      {notifications.map((notif) => (
        <NotificationToastItem
          key={notif.id}
          notification={notif}
          onDismiss={handleDismiss}
          onView={handleView}
        />
      ))}
    </div>
  );
}

