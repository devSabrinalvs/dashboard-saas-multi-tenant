"use client";

/**
 * WelcomeBanner — Banner de boas-vindas de primeira execução.
 *
 * Exibido uma única vez por organização quando o usuário acessa
 * o AppShell pela primeira vez. O dismiss é persistido em localStorage,
 * portanto não requer nenhuma mudança de schema ou endpoint.
 *
 * Chave localStorage: `wb_dismissed_<orgSlug>`
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeBannerProps {
  orgSlug: string;
  orgName: string;
}

function storageKey(slug: string): string {
  return `wb_dismissed_${slug}`;
}

export function WelcomeBanner({ orgSlug, orgName }: WelcomeBannerProps) {
  // Inicializa como null para evitar flash no SSR
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(storageKey(orgSlug));
      setVisible(dismissed !== "1");
    } catch {
      // localStorage indisponível (ex: iframe, modo privado restrito)
      setVisible(false);
    }
  }, [orgSlug]);

  function dismiss() {
    try {
      localStorage.setItem(storageKey(orgSlug), "1");
    } catch {
      // silencioso
    }
    setVisible(false);
  }

  // Não renderiza nada enquanto hidrata ou já foi dispensado
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="welcome-banner"
      className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm"
    >
      <div className="flex items-start gap-3">
        <Sparkles
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden
        />
        <div>
          <p className="font-medium text-foreground">
            Bem-vindo a <span className="text-primary">{orgName}</span>!
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Comece criando seu primeiro projeto para organizar o trabalho da
            equipe.
          </p>
          <div className="mt-2">
            <Button asChild size="sm" variant="default" onClick={dismiss}>
              <Link href={`/org/${orgSlug}/projects`}>
                Criar primeiro projeto
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Dispensar banner de boas-vindas"
        onClick={dismiss}
        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="welcome-banner-dismiss"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
