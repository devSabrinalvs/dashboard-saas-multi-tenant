"use client";

import { useState } from "react";
import { Plus, CheckCircle2, Circle, Trash2, Flag } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from "@/features/milestones/hooks/use-milestones";

interface MilestonesPanelProps {
  orgSlug: string;
  projectId: string;
  canManage: boolean;
}

export function MilestonesPanel({ orgSlug, projectId, canManage }: MilestonesPanelProps) {
  const { data, isLoading } = useMilestones(orgSlug, projectId);
  const createMutation = useCreateMilestone(orgSlug, projectId);
  const updateMutation = useUpdateMilestone(orgSlug, projectId);
  const deleteMutation = useDeleteMilestone(orgSlug, projectId);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createMutation.mutateAsync({
      name: name.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    });
    setName("");
    setDueDate("");
    setShowForm(false);
  }

  const milestones = data?.milestones ?? [];
  const open = milestones.filter((m) => m.status === "OPEN");
  const closed = milestones.filter((m) => m.status === "CLOSED");

  function isOverdue(m: { dueDate: string | null; status: string }) {
    return m.dueDate && m.status === "OPEN" && new Date(m.dueDate) < new Date();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Milestones</h3>
          {open.length > 0 && (
            <Badge variant="secondary" className="text-xs">{open.length} aberto{open.length > 1 ? "s" : ""}</Badge>
          )}
        </div>
        {canManage && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-3.5" />
            Novo
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="rounded-lg border p-3 space-y-3 bg-muted/30">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sprint 1, v1.0, Lançamento…"
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Prazo (opcional)</Label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={!name.trim() || createMutation.isPending}>
              Criar
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum milestone criado.</p>
      ) : (
        <div className="space-y-1.5">
          {[...open, ...closed].map((ms) => (
            <div
              key={ms.id}
              className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 hover:bg-muted/30 transition-colors"
            >
              <button
                onClick={() =>
                  canManage &&
                  updateMutation.mutate({
                    milestoneId: ms.id,
                    data: { status: ms.status === "OPEN" ? "CLOSED" : "OPEN" },
                  })
                }
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={ms.status === "OPEN" ? "Fechar milestone" : "Reabrir milestone"}
              >
                {ms.status === "CLOSED" ? (
                  <CheckCircle2 className="size-4 text-green-500" />
                ) : (
                  <Circle className="size-4" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${ms.status === "CLOSED" ? "line-through text-muted-foreground" : ""}`}>
                  {ms.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {ms.taskCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {ms.taskCount} tarefa{ms.taskCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {ms.dueDate && (
                    <span className={`text-xs ${isOverdue(ms) ? "text-destructive" : "text-muted-foreground"}`}>
                      {isOverdue(ms) ? "Atrasado · " : ""}
                      {format(new Date(ms.dueDate), "dd/MM/yyyy")}
                    </span>
                  )}
                  {!ms.dueDate && ms.createdAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ms.createdAt), { addSuffix: true, locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <button
                  onClick={() => deleteMutation.mutate(ms.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Remover milestone"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
