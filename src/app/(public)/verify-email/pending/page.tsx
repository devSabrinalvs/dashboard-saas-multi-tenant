"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/features/auth/components/turnstile-widget";

// ---------------------------------------------------------------------------
// Inner component (needs useSearchParams inside Suspense)
// ---------------------------------------------------------------------------

type Status = "idle" | "loading" | "success" | "error" | "rate-limited" | "bot";

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<Status>("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  async function handleResend() {
    if (turnstileToken === null) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });

      if (res.status === 429) {
        setStatus("rate-limited");
      } else if (res.status === 400) {
        setStatus("bot");
        setTurnstileKey((k) => k + 1);
        setTurnstileToken(null);
      } else if (!res.ok) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-foreground/8">
          <CheckCircle2 className="size-7 text-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Email enviado!</h2>
          <p className="text-sm text-muted-foreground">
            Se existir uma conta não verificada com esse endereço, você
            receberá um novo link em breve.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Não recebeu?{" "}
          <button
            type="button"
            className="underline hover:text-foreground transition-colors"
            onClick={() => {
              setStatus("idle");
              setTurnstileKey((k) => k + 1);
              setTurnstileToken(null);
            }}
          >
            Tentar novamente
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Icon + header */}
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-foreground/8">
          <Mail className="size-7 text-foreground/70" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Verifique seu email</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enviamos um link de verificação para{" "}
            {email ? (
              <strong className="text-foreground font-medium">{email}</strong>
            ) : (
              "o seu endereço de email"
            )}
            . Clique no link para ativar sua conta.
          </p>
        </div>
      </div>

      {/* Status alerts */}
      {(status === "error" || status === "rate-limited" || status === "bot") && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>
            {status === "rate-limited"
              ? "Muitas tentativas. Aguarde alguns minutos antes de reenviar."
              : status === "bot"
              ? "Verificação anti-bot falhou. Tente novamente."
              : "Falha ao enviar. Tente novamente."}
          </span>
        </div>
      )}

      {/* Resend section */}
      <div className="space-y-3">
        <p className="text-center text-sm text-muted-foreground">
          Não recebeu o email? Verifique a pasta de spam ou solicite um novo link.
        </p>

        <TurnstileWidget
          key={turnstileKey}
          onToken={(t) => setTurnstileToken(t)}
          onExpire={() => setTurnstileToken(null)}
        />

        <Button
          type="button"
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          disabled={status === "loading" || turnstileToken === null}
          onClick={() => void handleResend()}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Enviando…
            </>
          ) : (
            "Reenviar email de verificação"
          )}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-foreground hover:underline"
        >
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export (Suspense boundary for useSearchParams)
// ---------------------------------------------------------------------------

export default function VerifyEmailPendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="h-64" />}>
          <PendingContent />
        </Suspense>
      </div>
    </div>
  );
}
