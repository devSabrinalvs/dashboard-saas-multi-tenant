"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrgFormSchema,
  type CreateOrgFormData,
} from "@/schemas/organization";

type ApiResponse = { orgSlug: string } | { error: string };

export default function NewOrgPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrgFormData>({
    resolver: zodResolver(createOrgFormSchema),
  });

  async function onSubmit(data: CreateOrgFormData) {
    setServerError(null);
    setSlugError(null);

    const res = await fetch("/api/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        slug: data.slug || undefined,
      }),
    });

    const json = (await res.json()) as ApiResponse;

    if (res.status === 201 && "orgSlug" in json) {
      router.push(`/org/${json.orgSlug}/dashboard`);
      return;
    }

    if (res.status === 409) {
      setSlugError(
        "orgSlug" in json ? json.orgSlug : (json as { error: string }).error
      );
      return;
    }

    setServerError(
      "error" in json
        ? json.error
        : "Erro ao criar organização. Tente novamente."
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">
            Nova organização
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie um espaço para o seu time.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              placeholder="Minha Empresa"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-1">
            <Label htmlFor="slug">
              Slug{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Input
              id="slug"
              type="text"
              placeholder="gerado automaticamente"
              {...register("slug")}
            />
            <p className="text-xs text-muted-foreground">
              Usado na URL: /org/
              <strong>meu-slug</strong>/dashboard
            </p>
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            )}
            {slugError && (
              <p className="text-xs text-destructive">{slugError}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar organização"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link
            href="/org/select"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Voltar para seleção
          </Link>
        </p>
      </div>
    </div>
  );
}
