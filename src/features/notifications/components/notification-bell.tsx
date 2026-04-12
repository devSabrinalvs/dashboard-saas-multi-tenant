"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/shared/api/client";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppNotification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = ["notifications"] as const;

  const { data } = useQuery({
    queryKey,
    queryFn: () => apiClient.get<NotificationsResponse>("/api/notifications"),
    refetchInterval: 30_000, // polling a cada 30s
    staleTime: 15_000,
  });

  const unread = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  // Marcar todas como lidas
  const markAllMutation = useMutation({
    mutationFn: () => apiClient.patch("/api/notifications", {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  // Marcar uma como lida ao clicar
  const markOneMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/notifications/${id}`, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  function handleClick(n: AppNotification) {
    if (!n.readAt) markOneMutation.mutate(n.id);
    if (n.link) router.push(n.link);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-full p-1.5 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          {unread > 0 && (
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <CheckCheck className="size-3" />
              Marcar todas como lidas
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhuma notificação.
          </div>
        )}

        {notifications.map((n) => (
          <DropdownMenuItem
            key={n.id}
            className={cn(
              "flex flex-col items-start gap-0.5 px-3 py-2 cursor-pointer",
              !n.readAt && "bg-primary/5"
            )}
            onClick={() => handleClick(n)}
          >
            <div className="flex w-full items-start justify-between gap-2">
              <p className={cn("text-xs leading-snug", !n.readAt && "font-medium")}>
                {n.message}
              </p>
              {n.link && <ExternalLink className="size-3 shrink-0 text-muted-foreground mt-0.5" />}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {formatRelative(n.createdAt)}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
