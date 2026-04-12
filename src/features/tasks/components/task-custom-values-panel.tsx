"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiClient } from "@/shared/api/client";
import { useQuery as useFieldsQuery } from "@tanstack/react-query";

interface FieldDef {
  id: string;
  name: string;
  type: string;
  options: string[];
}

interface FieldValue {
  id: string;
  fieldDefId: string;
  fieldName: string;
  fieldType: string;
  value: string;
}

interface Props {
  orgSlug: string;
  taskId: string;
  canUpdate?: boolean;
}

export function TaskCustomValuesPanel({ orgSlug, taskId, canUpdate = false }: Props) {
  const queryClient = useQueryClient();
  const valuesUrl = `/api/org/${orgSlug}/tasks/${taskId}/custom-values`;
  const defsUrl = `/api/org/${orgSlug}/custom-fields`;
  const valuesKey = ["custom-values", orgSlug, taskId] as const;
  const defsKey = ["custom-fields", orgSlug] as const;

  const { data: defs, isLoading: defsLoading } = useFieldsQuery({
    queryKey: defsKey,
    queryFn: () => apiClient.get<{ fields: FieldDef[] }>(defsUrl).then((r) => r.fields),
  });

  const { data: values, isLoading: valuesLoading } = useQuery({
    queryKey: valuesKey,
    queryFn: () => apiClient.get<{ values: FieldValue[] }>(valuesUrl).then((r) => r.values),
  });

  const saveMutation = useMutation({
    mutationFn: ({ fieldDefId, value }: { fieldDefId: string; value: string }) =>
      apiClient.post(valuesUrl, { fieldDefId, value }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: valuesKey });
    },
    onError: () => toast.error("Erro ao salvar campo."),
  });

  const isLoading = defsLoading || valuesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Carregando…
      </div>
    );
  }

  const fieldDefs = defs ?? [];
  if (fieldDefs.length === 0) return null;

  const valueMap = Object.fromEntries(
    (values ?? []).map((v) => [v.fieldDefId, v.value])
  );

  function handleChange(fieldDefId: string, value: string) {
    saveMutation.mutate({ fieldDefId, value });
  }

  return (
    <div className="space-y-3">
      {fieldDefs.map((def) => {
        const currentValue = valueMap[def.id] ?? "";
        return (
          <div key={def.id} className="space-y-1">
            <Label className="text-xs">{def.name}</Label>
            {def.type === "SELECT" ? (
              <Select
                value={currentValue || "__empty__"}
                onValueChange={(v) => handleChange(def.id, v === "__empty__" ? "" : v)}
                disabled={!canUpdate}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">—</SelectItem>
                  {def.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={def.type === "NUMBER" ? "number" : def.type === "DATE" ? "date" : "text"}
                className="h-8 text-sm"
                defaultValue={currentValue}
                disabled={!canUpdate}
                onBlur={(e) => {
                  if (e.target.value !== currentValue) {
                    handleChange(def.id, e.target.value);
                  }
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
