"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Monitor, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/server/security/session-utils";

interface SessionItem {
  id: string;
  sessionId: string;
  isCurrent: boolean;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  deviceLabel: string | null;
}

type PanelState = "idle" | "loading" | "error";

export function SessionsPanel() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [state, setState] = useState<PanelState>("loading");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/auth/sessions");
      if (!res.ok) throw new Error("fetch failed");
      setSessions(await res.json() as SessionItem[]);
      setState("idle");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  async function revokeOne(sessionId: string, isCurrent: boolean) {
    setRevoking(sessionId);
    try {
      const res = await fetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) return;
      if (isCurrent) {
        await signOut({ callbackUrl: "/login" });
        return;
      }
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } finally {
      setRevoking(null);
    }
  }

  async function revokeOthers() {
    setRevokingAll(true);
    try {
      const res = await fetch("/api/auth/sessions/revoke-others", { method: "POST" });
      if (!res.ok) return;
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } finally {
      setRevokingAll(false);
    }
  }

  const otherCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-4">
      {state === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="size-4 animate-spin" />
          Carregando sessões…
        </div>
      )}

      {state === "error" && (
        <div className="flex items-center gap-2 text-sm text-destructive py-2">
          <ShieldAlert className="size-4" />
          Não foi possível carregar sessões.
          <button
            onClick={fetchSessions}
            className="underline hover:no-underline ml-1 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {state === "idle" && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          Nenhuma sessão ativa encontrada.
        </p>
      )}

      {state === "idle" && sessions.length > 0 && (
        <>
          <ul className="divide-y divide-border rounded-lg border overflow-hidden">
            {sessions.map((s) => (
              <li key={s.sessionId} className="flex items-center justify-between gap-4 px-4 py-3 bg-card">
                <div className="flex items-start gap-3 min-w-0">
                  <Monitor className="size-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {s.deviceLabel ?? "Dispositivo desconhecido"}
                      </span>
                      {s.isCurrent && (
                        <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground shrink-0">
                          Atual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {s.ip ? `${s.ip} · ` : ""}
                      Ativo {formatRelativeTime(new Date(s.lastSeenAt))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Login em {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={revoking === s.sessionId}
                  onClick={() => revokeOne(s.sessionId, s.isCurrent)}
                  aria-label={s.isCurrent ? "Encerrar sessão atual" : "Encerrar sessão"}
                >
                  {revoking === s.sessionId ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  {s.isCurrent ? "Sair" : "Encerrar"}
                </Button>
              </li>
            ))}
          </ul>

          {otherCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={revokingAll}
              onClick={revokeOthers}
            >
              {revokingAll ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Encerrar outras {otherCount} {otherCount === 1 ? "sessão" : "sessões"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
