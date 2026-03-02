"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createInviteSchema, type CreateInviteInput } from "@/schemas/invite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteFormProps {
  orgSlug: string;
}

interface InviteResult {
  inviteId: string;
  inviteLink: string;
  expiresAt: string;
}

export function InviteForm({ orgSlug }: InviteFormProps) {
  const router = useRouter();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateInviteInput>({
    resolver: zodResolver(createInviteSchema),
  });

  async function onSubmit(data: CreateInviteInput) {
    setInviteLink(null);
    const res = await fetch(`/api/org/${orgSlug}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });

    if (res.ok) {
      const body = (await res.json()) as InviteResult;
      setInviteLink(body.inviteLink);
      reset();
      router.refresh();
      return;
    }

    const body = (await res.json()) as { error?: string };
    if (res.status === 409) {
      setError("email", { message: body.error ?? "Convite duplicado." });
      return;
    }
    setError("email", { message: body.error ?? "Erro ao criar convite." });
  }

  async function handleCopy() {
    if (!inviteLink) return;
    const full = window.location.origin + inviteLink;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Convidar por email</h3>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex gap-2 items-start"
      >
        <div className="flex-1 space-y-1">
          <Label htmlFor="invite-email" className="sr-only">
            Email
          </Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colaborador@empresa.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting} size="sm">
          {isSubmitting ? "Enviando…" : "Convidar"}
        </Button>
      </form>

      {inviteLink && (
        <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {window.location.origin + inviteLink}
          </span>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? "Copiado!" : "Copiar link"}
          </Button>
        </div>
      )}
    </div>
  );
}
