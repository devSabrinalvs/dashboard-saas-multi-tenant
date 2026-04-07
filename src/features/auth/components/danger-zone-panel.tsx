"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { TriangleAlert, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { csrfHeaders } from "@/lib/csrf-client";

export type ReauthMethod = "password" | "totp" | "recentLogin";

interface DangerZonePanelProps {
  userEmail: string;
  reauthMethod: ReauthMethod;
}

export function DangerZonePanel({ userEmail, reauthMethod }: DangerZonePanelProps) {
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const confirmValid =
    confirmText === userEmail || confirmText === "DELETE";

  const reauthValid =
    reauthMethod === "password"
      ? password.length >= 8
      : reauthMethod === "totp"
      ? totpCode.length === 6
      : true; // recentLogin — apenas check server-side

  const canSubmit = confirmValid && reauthValid && understood && !isSubmitting;

  async function handleDelete() {
    setError(null);
    setIsSubmitting(true);
    try {
      const body: Record<string, string> = { confirmText };
      if (reauthMethod === "password") body.password = password;
      if (reauthMethod === "totp") body.totpCode = totpCode;

      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: csrfHeaders(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await signOut({ callbackUrl: "/login?deleted=1" });
        return;
      }

      const data = await res.json() as { error?: string };
      setError(data.error ?? "Erro ao deletar conta. Tente novamente.");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <TriangleAlert className="size-5 mt-0.5 shrink-0 text-destructive" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium text-sm text-destructive">Deletar conta</p>
          <p className="text-sm text-muted-foreground">
            Esta ação é permanente e irreversível. Você perderá acesso a todas
            as organizações e dados vinculados à sua conta.
          </p>
        </div>
      </div>

      {!showForm ? (
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => setShowForm(true)}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Quero deletar minha conta
        </Button>
      ) : (
        <div className="space-y-4 pt-2">
          {/* Confirmação de texto */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-text" className="text-sm">
              Digite <strong>{userEmail}</strong> ou{" "}
              <strong className="font-mono">DELETE</strong> para confirmar
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={userEmail}
              autoComplete="off"
              className={cn(
                confirmText && !confirmValid && "border-destructive"
              )}
            />
          </div>

          {/* Reautenticação */}
          {reauthMethod === "password" && (
            <div className="space-y-1.5">
              <Label htmlFor="reauth-password" className="text-sm">
                Senha atual
              </Label>
              <Input
                id="reauth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          )}

          {reauthMethod === "totp" && (
            <div className="space-y-1.5">
              <Label htmlFor="reauth-totp" className="text-sm">
                Código do autenticador (6 dígitos)
              </Label>
              <Input
                id="reauth-totp"
                value={totpCode}
                onChange={(e) =>
                  setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
          )}

          {reauthMethod === "recentLogin" && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              Sua conta usa login com Google sem 2FA. A deleção só é permitida
              nos <strong>10 minutos após o login</strong>. Se necessário,{" "}
              <a
                href="/login"
                className="underline hover:no-underline text-foreground"
              >
                faça login novamente
              </a>
              .
            </div>
          )}

          {/* Checkbox de entendimento */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-0.5 size-4 cursor-pointer"
            />
            <span className="text-sm text-muted-foreground leading-snug">
              Entendo que esta ação é irreversível e que perderei acesso a
              todas as organizações e dados vinculados.
            </span>
          </label>

          {/* Erro */}
          {error && (
            <div
              className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
              role="alert"
            >
              <TriangleAlert className="size-4 mt-0.5 shrink-0" aria-hidden />
              {error}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setError(null);
                setConfirmText("");
                setPassword("");
                setTotpCode("");
                setUnderstood(false);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!canSubmit}
              onClick={handleDelete}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Deletar minha conta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
