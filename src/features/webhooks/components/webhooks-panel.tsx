"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Webhook, Copy, Check, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/shared/api/client";

const ALL_EVENTS = [
  "task.created", "task.updated", "task.deleted", "task.status_changed",
  "project.created", "project.deleted", "member.invited", "member.removed",
] as const;

type WebhookEventType = typeof ALL_EVENTS[number];

interface OrgWebhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  createdAt: string;
}

interface WebhooksPanelProps {
  orgSlug: string;
}

export function WebhooksPanel({ orgSlug }: WebhooksPanelProps) {
  const qc = useQueryClient();
  const whKey = ["webhooks", orgSlug];

  const { data, isLoading } = useQuery({
    queryKey: whKey,
    queryFn: () => apiClient.get<{ webhooks: OrgWebhook[] }>(`/api/org/${orgSlug}/webhooks`),
  });

  const createMutation = useMutation({
    mutationFn: (body: { url: string; events: string[] }) =>
      apiClient.post<{ webhook: OrgWebhook }>(`/api/org/${orgSlug}/webhooks`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: whKey }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient.patch(`/api/org/${orgSlug}/webhooks/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: whKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/org/${orgSlug}/webhooks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: whKey }),
  });

  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEventType>>(new Set(["task.created", "task.status_changed"]));
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleEvent(ev: WebhookEventType) {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(ev)) next.delete(ev);
      else next.add(ev);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!url || selectedEvents.size === 0) return;
    const result = await createMutation.mutateAsync({ url, events: Array.from(selectedEvents) });
    if (result.webhook.secret) setNewSecret(result.webhook.secret);
    setUrl("");
    setShowForm(false);
  }

  async function copySecret() {
    if (!newSecret) return;
    await navigator.clipboard.writeText(newSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const webhooks = data?.webhooks ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Webhooks</h3>
          <Badge variant="secondary" className="text-xs">{webhooks.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-3.5" />
          Novo
        </Button>
      </div>

      {/* Secret banner */}
      {newSecret && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Copie o secret agora — ele não será exibido novamente.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs font-mono border">
              {newSecret}
            </code>
            <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => void copySecret()}>
              {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setNewSecret(null)}>
            Fechar
          </Button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 rounded-lg border p-3 bg-muted/30">
          <div className="space-y-1.5">
            <Label className="text-xs">URL de destino</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Eventos</Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_EVENTS.map((ev) => (
                <button
                  key={ev}
                  type="button"
                  onClick={() => toggleEvent(ev)}
                  className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                    selectedEvents.has(ev)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={!url || selectedEvents.size === 0 || createMutation.isPending}>
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
      ) : webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum webhook configurado.</p>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-mono truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {wh.events.map((ev) => (
                      <Badge key={ev} variant="secondary" className="text-xs px-1.5 py-0">{ev}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: wh.id, active: !wh.active })}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={wh.active ? "Desativar" : "Ativar"}
                  >
                    {wh.active ? <ToggleRight className="size-5 text-primary" /> : <ToggleLeft className="size-5" />}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(wh.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <Badge variant={wh.active ? "default" : "secondary"} className="text-xs">
                {wh.active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
