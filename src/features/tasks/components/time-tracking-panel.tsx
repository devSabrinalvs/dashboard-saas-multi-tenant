"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/shared/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeEntry {
  id: string;
  startedAt: string;
  stoppedAt: string | null;
  durationMinutes: number | null;
  note: string | null;
  userId: string;
  userName: string | null;
  userEmail: string;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${m > 0 ? `${m}min` : ""}`.trim();
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h > 0 ? String(h).padStart(2, "0") : null, String(m).padStart(2, "0"), String(s).padStart(2, "0")]
    .filter(Boolean)
    .join(":");
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TimeTrackingPanelProps {
  orgSlug: string;
  taskId: string;
  currentUserId: string;
  canUpdate: boolean;
}

export function TimeTrackingPanel({ orgSlug, taskId, currentUserId, canUpdate }: TimeTrackingPanelProps) {
  const qc = useQueryClient();
  const timeKey = ["time-entries", orgSlug, taskId];

  const { data } = useQuery({
    queryKey: timeKey,
    queryFn: () =>
      apiClient.get<{ entries: TimeEntry[]; totalMinutes: number }>(
        `/api/org/${orgSlug}/tasks/${taskId}/time`
      ),
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: (body: { startedAt: string; stoppedAt?: string; note?: string }) =>
      apiClient.post(`/api/org/${orgSlug}/tasks/${taskId}/time`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: timeKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) =>
      apiClient.delete(`/api/org/${orgSlug}/tasks/${taskId}/time/${entryId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: timeKey }),
  });

  // Timer state
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState("");
  const startRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      startRef.current = new Date();
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current!.getTime()) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  async function handleStop() {
    if (!startRef.current) return;
    const stoppedAt = new Date().toISOString();
    setRunning(false);
    await addMutation.mutateAsync({
      startedAt: startRef.current.toISOString(),
      stoppedAt,
      note: note.trim() || undefined,
    });
    setNote("");
  }

  const entries = data?.entries ?? [];
  const totalMinutes = data?.totalMinutes ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Tempo</h3>
        {totalMinutes > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            Total: {formatDuration(totalMinutes)}
          </span>
        )}
      </div>

      {/* Timer */}
      {canUpdate && (
        <div className="flex items-center gap-2 rounded-lg border p-2.5">
          {running ? (
            <>
              <span className="font-mono text-sm text-primary tabular-nums w-16">
                {formatElapsed(elapsed)}
              </span>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota opcional…"
                className="h-7 text-xs flex-1"
              />
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs gap-1"
                onClick={() => void handleStop()}
              >
                <Square className="size-3" />
                Parar
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => setRunning(true)}
            >
              <Play className="size-3" />
              Iniciar timer
            </Button>
          )}
        </div>
      )}

      {/* Entries list */}
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 text-xs text-muted-foreground py-1 group">
              <span className="font-medium text-foreground w-12 shrink-0">
                {entry.durationMinutes != null ? formatDuration(entry.durationMinutes) : "—"}
              </span>
              <span className="truncate flex-1">{entry.note ?? format(new Date(entry.startedAt), "dd/MM HH:mm", { locale: ptBR })}</span>
              <span className="shrink-0">{entry.userName ?? entry.userEmail.split("@")[0]}</span>
              {entry.userId === currentUserId && (
                <button
                  onClick={() => deleteMutation.mutate(entry.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum tempo registrado.</p>
      )}
    </div>
  );
}
