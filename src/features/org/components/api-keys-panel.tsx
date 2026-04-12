"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Copy, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "@/shared/api/client";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  active: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface KeysResponse {
  keys: ApiKey[];
}

interface CreateResponse {
  key: ApiKey;
  fullKey: string;
}

export function ApiKeysPanel({ orgSlug }: { orgSlug: string }) {
  const queryClient = useQueryClient();
  const baseUrl = `/api/org/${orgSlug}/api-keys`;
  const queryKey = ["api-keys", orgSlug] as const;

  const [nameInput, setNameInput] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiClient.get<KeysResponse>(baseUrl).then((r) => r.keys),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiClient.post<CreateResponse>(baseUrl, { name }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey });
      setNameInput("");
      setRevealedKey(res.fullKey);
      toast.success("API key criada. Copie agora — não será exibida novamente.");
    },
    onError: () => toast.error("Erro ao criar API key."),
  });

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) =>
      apiClient.delete(`${baseUrl}/${keyId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success("API key revogada.");
    },
    onError: () => toast.error("Erro ao revogar API key."),
  });

  const activeKeys = (data ?? []).filter((k) => k.active);

  function handleCopy(value: string) {
    void navigator.clipboard.writeText(value);
    toast.success("Copiado!");
  }

  return (
    <div className="space-y-4">
      {/* Revealed key banner */}
      {revealedKey && (
        <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30 p-3">
          <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            Copie esta chave agora. Ela não será exibida novamente.
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs flex-1 font-mono break-all text-yellow-900 dark:text-yellow-100">
              {revealedKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs gap-1 shrink-0"
              onClick={() => handleCopy(revealedKey)}
            >
              <Copy className="size-3" />
              Copiar
            </Button>
          </div>
          <button
            className="text-xs text-yellow-700 dark:text-yellow-400 mt-1 underline"
            onClick={() => setRevealedKey(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {/* Key list */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Carregando…
        </div>
      )}

      {!isLoading && activeKeys.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma API key ativa.</p>
      )}

      <div className="space-y-2">
        {activeKeys.map((key) => (
          <div
            key={key.id}
            className="flex items-center gap-3 rounded-md border px-3 py-2"
          >
            <Key className="size-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{key.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {key.prefix}…
                {key.lastUsedAt && (
                  <span className="ml-2">
                    Último uso: {new Date(key.lastUsedAt).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">Ativa</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive gap-1"
              onClick={() => revokeMutation.mutate(key.id)}
              disabled={revokeMutation.isPending}
            >
              <Trash2 className="size-3" />
              Revogar
            </Button>
          </div>
        ))}
      </div>

      {/* Create new key */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label htmlFor="api-key-name" className="text-xs">Nome da chave</Label>
          <Input
            id="api-key-name"
            placeholder="Ex: CI/CD, Integração Slack"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            disabled={createMutation.isPending}
            maxLength={64}
            className="h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          className="gap-1 h-8"
          onClick={() => createMutation.mutate(nameInput.trim())}
          disabled={createMutation.isPending || !nameInput.trim()}
        >
          {createMutation.isPending
            ? <Loader2 className="size-4 animate-spin" />
            : <Plus className="size-4" />
          }
          Criar
        </Button>
      </div>
    </div>
  );
}
