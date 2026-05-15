"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthPageShell } from "@/features/auth/components/auth-shell";

const FONT = "var(--font-space-grotesk), sans-serif";

type ApiResponse = { orgSlug: string } | { error: string };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export default function NewOrgPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [slugFocused, setSlugFocused] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!slugDirty) {
      setSlug(slugify(name));
    }
  }, [name, slugDirty]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSlugError(null);
    setIsSubmitting(true);

    const res = await fetch("/api/org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || undefined }),
    });

    const json = (await res.json()) as ApiResponse;
    setIsSubmitting(false);

    if (res.status === 201 && "orgSlug" in json) {
      router.push(`/org/${json.orgSlug}/dashboard`);
      return;
    }

    if (res.status === 409) {
      setSlugError("error" in json ? json.error : "Este slug já está em uso.");
      return;
    }

    setServerError("error" in json ? json.error : "Erro ao criar organização. Tente novamente.");
  }

  const slugPreview = slug || "sua-org";

  return (
    <AuthPageShell
      topBarRight={
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          fontSize: "11px", color: "#3a3a3a",
          letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FONT,
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#5a5a5a", display: "inline-block" }} />
          Configuração
        </div>
      }
      footer={
        <a
          href="/org/select"
          style={{
            fontSize: "12px", color: "#555", textDecoration: "none",
            fontFamily: FONT, letterSpacing: "0.02em",
            display: "inline-flex", alignItems: "center", gap: "6px",
          }}
        >
          ← Voltar
        </a>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Icon */}
        <div style={{
          width: "56px", height: "56px", borderRadius: "12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#bdbdbd",
        }}>
          <BuildingIcon />
        </div>

        {/* Header */}
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: "#5a5a5a",
            letterSpacing: "0.16em", textTransform: "uppercase",
            marginBottom: "14px", fontFamily: FONT,
          }}>
            Configuração
          </div>
          <h2 style={{
            fontSize: "26px", fontWeight: 600, color: "#efefef",
            letterSpacing: "-0.025em", marginBottom: "8px", lineHeight: 1.18, fontFamily: FONT,
          }}>
            Crie sua organização
          </h2>
          <p style={{ fontSize: "13px", color: "#7a7a7a", lineHeight: 1.65, fontFamily: FONT }}>
            Você será o proprietário. Convide o time depois — leva só dois minutos.
          </p>
        </div>

        {/* Name field */}
        <div>
          <label style={{
            display: "block", fontSize: "11px", fontWeight: 600, color: "#4a4a4a",
            letterSpacing: "0.09em", textTransform: "uppercase",
            marginBottom: "8px", fontFamily: FONT,
          }}>
            Nome da organização
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            placeholder="Acme Corp"
            required
            style={{
              width: "100%", padding: "13px 16px", boxSizing: "border-box",
              background: "#161616",
              border: `1px solid ${nameFocused ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: "7px", color: "#efefef", fontSize: "14px",
              fontFamily: FONT, fontWeight: 400,
              outline: "none", transition: "border-color 0.18s ease", caretColor: "#fff",
            }}
          />
        </div>

        {/* Slug field */}
        <div>
          <label style={{
            display: "block", fontSize: "11px", fontWeight: 600, color: "#4a4a4a",
            letterSpacing: "0.09em", textTransform: "uppercase",
            marginBottom: "8px", fontFamily: FONT,
          }}>
            URL da organização
          </label>
          <div style={{
            display: "flex", alignItems: "stretch",
            background: "#161616",
            border: `1px solid ${slugFocused ? "rgba(255,255,255,0.28)" : slugError ? "rgba(154,90,90,0.4)" : "rgba(255,255,255,0.07)"}`,
            borderRadius: "7px", overflow: "hidden",
            transition: "border-color 0.18s ease",
          }}>
            <span style={{
              padding: "13px 4px 13px 16px",
              fontSize: "14px", color: "#5a5a5a",
              fontFamily: FONT, userSelect: "none",
              display: "flex", alignItems: "center",
            }}>
              projorg.app/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugDirty(true);
                setSlugError(null);
              }}
              onFocus={() => setSlugFocused(true)}
              onBlur={() => setSlugFocused(false)}
              placeholder="minha-org"
              style={{
                flex: 1, padding: "13px 16px 13px 0",
                background: "transparent", border: "none",
                color: "#efefef", fontSize: "14px",
                fontFamily: FONT, fontWeight: 500,
                outline: "none", caretColor: "#fff",
              }}
            />
          </div>

          {/* Slug status */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
            {slugError ? (
              <>
                <span style={{
                  width: "12px", height: "12px", borderRadius: "50%",
                  background: "rgba(154,90,90,0.2)", border: "1px solid rgba(154,90,90,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#b88a8a", flexShrink: 0,
                }}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </span>
                <span style={{ fontSize: "11px", color: "#b88a8a", fontFamily: FONT }}>{slugError}</span>
              </>
            ) : (
              <>
                <span style={{
                  width: "12px", height: "12px", borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#cfcfcf", flexShrink: 0,
                }}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span style={{ fontSize: "11px", color: "#7a7a7a", fontFamily: FONT }}>
                  <span style={{ color: "#9a9a9a" }}>projorg.app/{slugPreview}</span>
                  {" "}está disponível
                </span>
              </>
            )}
          </div>
        </div>

        {/* Server error */}
        {serverError && (
          <p style={{ fontSize: "12px", color: "#b88a8a", fontFamily: FONT }}>{serverError}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          style={{
            padding: "14px", borderRadius: "7px",
            background: isSubmitting || !name.trim() ? "rgba(240,240,240,0.5)" : "#f0f0f0",
            color: "#080808",
            fontSize: "14px", fontWeight: 600,
            fontFamily: FONT, border: "none",
            cursor: isSubmitting || !name.trim() ? "not-allowed" : "pointer",
            letterSpacing: "0.025em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "background 0.15s",
          }}
        >
          {isSubmitting && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
              <circle cx="12" cy="12" r="9" stroke="rgba(8,8,8,0.25)" strokeWidth="2.5" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </svg>
          )}
          {isSubmitting ? "Criando…" : "Criar organização"}
        </button>

        {/* Plan info */}
        <p style={{
          fontSize: "11.5px", color: "#3a3a3a", lineHeight: 1.6,
          fontFamily: FONT, textAlign: "center",
        }}>
          Plano <span style={{ color: "#7a7a7a" }}>Free</span> · até 10 membros · sem cartão
        </p>
      </form>
    </AuthPageShell>
  );
}

function BuildingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" />
    </svg>
  );
}
