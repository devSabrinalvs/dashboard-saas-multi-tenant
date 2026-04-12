"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

// ─── Schema ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, "Nome não pode ser vazio").max(80, "Nome muito longo").trim(),
});

type ProfileInput = z.infer<typeof profileSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfilePanelProps {
  name: string | null;
  email: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProfilePanel({ name, email }: ProfilePanelProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: name ?? "" },
  });

  async function onSubmit(data: ProfileInput) {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao salvar perfil.");
        return;
      }
      toast.success("Perfil atualizado.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="text-base bg-primary/10 text-primary font-semibold">
            {getInitials(name, email)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{name ?? "(sem nome)"}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-sm">
        <div className="space-y-1">
          <Label htmlFor="profile-name">Nome de exibição</Label>
          <Input
            id="profile-name"
            placeholder="Seu nome"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <Button type="submit" size="sm" disabled={saving || !isDirty}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </div>
  );
}
