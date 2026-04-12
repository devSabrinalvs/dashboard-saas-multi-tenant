"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient } from "@/shared/api/client";

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  DATE: "Data",
  SELECT: "Seleção",
};

interface FieldDef {
  id: string;
  name: string;
  type: string;
  options: string[];
  position: number;
}

export function CustomFieldsManager({ orgSlug }: { orgSlug: string }) {
  const queryClient = useQueryClient();
  const baseUrl = `/api/org/${orgSlug}/custom-fields`;
  const queryKey = ["custom-fields", orgSlug] as const;

  const [name, setName] = useState("");
  const [type, setType] = useState<string>("TEXT");
  const [optionsInput, setOptionsInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => apiClient.get<{ fields: FieldDef[] }>(baseUrl).then((r) => r.fields),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; type: string; options: string[] }) =>
      apiClient.post(baseUrl, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      setName("");
      setOptionsInput("");
      toast.success("Campo criado.");
    },
    onError: () => toast.error("Erro ao criar campo."),
  });

  const deleteMutation = useMutation({
    mutationFn: (fieldId: string) => apiClient.delete(`${baseUrl}/${fieldId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.success("Campo removido.");
    },
    onError: () => toast.error("Erro ao remover campo."),
  });

  function handleCreate() {
    if (!name.trim()) return;
    const options =
      type === "SELECT"
        ? optionsInput.split(",").map((o) => o.trim()).filter(Boolean)
        : [];
    createMutation.mutate({ name: name.trim(), type, options });
  }

  const fields = data ?? [];

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Carregando…
        </div>
      )}

      {!isLoading && fields.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum campo customizado definido.</p>
      )}

      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{field.name}</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {FIELD_TYPE_LABELS[field.type] ?? field.type}
              </Badge>
              {field.options.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Opções: {field.options.join(", ")}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive gap-1"
              onClick={() => deleteMutation.mutate(field.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Create form */}
      <div className="rounded-md border p-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Novo campo
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="cf-name" className="text-xs">Nome</Label>
            <Input
              id="cf-name"
              placeholder="Ex: Estimativa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cf-type" className="text-xs">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="cf-type" className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {type === "SELECT" && (
          <div className="space-y-1">
            <Label htmlFor="cf-options" className="text-xs">
              Opções <span className="text-muted-foreground">(separadas por vírgula)</span>
            </Label>
            <Input
              id="cf-options"
              placeholder="Baixo, Médio, Alto"
              value={optionsInput}
              onChange={(e) => setOptionsInput(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}

        <Button
          size="sm"
          className="gap-1 h-8"
          onClick={handleCreate}
          disabled={createMutation.isPending || !name.trim()}
        >
          {createMutation.isPending
            ? <Loader2 className="size-4 animate-spin" />
            : <Plus className="size-4" />
          }
          Criar campo
        </Button>
      </div>
    </div>
  );
}
