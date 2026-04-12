"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/shared/api/client";

interface OrgSettingsPanelProps {
  orgSlug: string;
  orgName: string;
  isOwner: boolean;
}

export function OrgSettingsPanel({ orgSlug, orgName, isOwner }: OrgSettingsPanelProps) {
  const router = useRouter();
  const [name, setName] = useState(orgName);
  const [slug, setSlug] = useState(orgSlug);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaveOk(false);
    setSaving(true);
    try {
      const result = await apiClient.patch<{ org: { slug: string; name: string } }>(
        `/api/org/${orgSlug}/settings`,
        { name: name.trim(), slug: slug.trim() }
      );
      setSaveOk(true);
      // If slug changed, redirect to new URL
      if (result.org.slug !== orgSlug) {
        router.push(`/org/${result.org.slug}/settings`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleteError("");
    setDeleting(true);
    try {
      await apiClient.delete(`/api/org/${orgSlug}/settings`);
      router.push("/org/select");
    } catch (err) {
      setDeleteError((err as Error).message);
      setDeleting(false);
    }
  }

  if (!isOwner) return null;

  return (
    <div className="space-y-6">
      {/* Edit name/slug */}
      <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Dados da organização</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="org-name" className="text-xs">Nome</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-slug" className="text-xs">Slug (URL)</Label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              maxLength={48}
              className="h-8 text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              /org/<strong>{slug || "…"}</strong>/dashboard
            </p>
          </div>
        </div>

        {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        {saveOk && <p className="text-xs text-green-600">Salvo com sucesso.</p>}

        <Button
          type="submit"
          size="sm"
          disabled={saving || (!name.trim() && !slug.trim()) || (name === orgName && slug === orgSlug)}
          className="h-8"
        >
          Salvar alterações
        </Button>
      </form>

      {/* Delete org */}
      <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          <span className="text-sm font-semibold">Deletar organização</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Esta ação é irreversível. Todos os projetos, tarefas e membros serão removidos.
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs">
            Digite <strong>{orgSlug}</strong> para confirmar
          </Label>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={orgSlug}
            className="h-8 text-sm max-w-xs"
          />
        </div>
        {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
        <Button
          variant="destructive"
          size="sm"
          className="h-8"
          disabled={deleteConfirm !== orgSlug || deleting}
          onClick={() => void handleDelete()}
        >
          Deletar organização
        </Button>
      </div>
    </div>
  );
}
