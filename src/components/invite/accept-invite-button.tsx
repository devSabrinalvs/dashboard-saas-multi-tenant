"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FONT = "var(--font-space-grotesk), sans-serif";

interface AcceptInviteButtonProps {
  token: string;
}

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/invite/${token}/accept`, {
      method: "POST",
    });

    setLoading(false);

    if (res.ok) {
      const data = (await res.json()) as { orgSlug: string };
      router.push(`/org/${data.orgSlug}/dashboard`);
      return;
    }

    if (res.status === 401) {
      router.push(`/login?callbackUrl=/invite/${token}`);
      return;
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setError(body.error ?? "Erro ao aceitar convite.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <button
        onClick={handleAccept}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "7px",
          background: loading ? "rgba(240,240,240,0.6)" : "#f0f0f0",
          color: "#080808",
          fontSize: "14px",
          fontWeight: 600,
          fontFamily: FONT,
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: "0.025em",
          transition: "background 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {loading && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="12" cy="12" r="9" stroke="rgba(8,8,8,0.2)" strokeWidth="2.5" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </svg>
        )}
        {loading ? "Aceitando…" : "Aceitar convite"}
      </button>
      {error && (
        <p style={{ fontSize: "12px", color: "#b88a8a", textAlign: "center", fontFamily: FONT }}>
          {error}
        </p>
      )}
    </div>
  );
}
