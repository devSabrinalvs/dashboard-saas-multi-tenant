"use client";

import { useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrgTags, useCreateOrgTag, useDeleteOrgTag } from "@/features/tags/hooks/use-org-tags";

const PRESET_COLORS = [
  "#6366f1", "#3b82f6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6",
  "#64748b", "#0ea5e9", "#84cc16", "#f97316",
];

interface OrgTagsPanelProps {
  orgSlug: string;
  canManage: boolean;
}

export function OrgTagsPanel({ orgSlug, canManage }: OrgTagsPanelProps) {
  const { data, isLoading } = useOrgTags(orgSlug);
  const createMutation = useCreateOrgTag(orgSlug);
  const deleteMutation = useDeleteOrgTag(orgSlug);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!newName.trim()) return;
    try {
      await createMutation.mutateAsync({ name: newName.trim(), color: newColor });
      setNewName("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const tags = data?.tags ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Tags da Organização</h3>
      </div>

      {/* Tag list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma tag criada ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
              style={{ borderColor: tag.color + "60", background: tag.color + "18" }}
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ background: tag.color }}
              />
              <span style={{ color: tag.color }}>{tag.name}</span>
              {canManage && (
                <button
                  onClick={() => deleteMutation.mutate(tag.id)}
                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remover tag ${tag.name}`}
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {canManage && (
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 border-t pt-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="tag-name" className="text-xs">
                Nova tag
              </Label>
              <Input
                id="tag-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: bug, feature, urgente…"
                maxLength={32}
                className="h-8 text-sm"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!newName.trim() || createMutation.isPending}
              className="h-8"
            >
              <Plus className="size-3.5" />
              Criar
            </Button>
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <Label className="text-xs">Cor</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="size-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    background: c,
                    borderColor: newColor === c ? c : "transparent",
                    outline: newColor === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
      )}
    </div>
  );
}
