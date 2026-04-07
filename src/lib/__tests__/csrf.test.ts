/**
 * Testes unitários — CSRF (double-submit cookie)
 *
 * Cobre:
 * - parseCsrfCookie: extrai token do header Cookie
 * - validateCsrfRequest: aceita token válido, rejeita ausente/divergente
 */

import { parseCsrfCookie, validateCsrfRequest } from "@/lib/csrf";

// ---------------------------------------------------------------------------
// parseCsrfCookie
// ---------------------------------------------------------------------------

describe("parseCsrfCookie", () => {
  it("extrai token de cookie isolado", () => {
    expect(parseCsrfCookie("csrf_token=abc123")).toBe("abc123");
  });

  it("extrai token de múltiplos cookies", () => {
    expect(parseCsrfCookie("session=xyz; csrf_token=tok42; other=val")).toBe("tok42");
  });

  it("extrai token quando csrf_token é o primeiro cookie", () => {
    expect(parseCsrfCookie("csrf_token=firstval; session=xyz")).toBe("firstval");
  });

  it("retorna null quando cookie não existe", () => {
    expect(parseCsrfCookie("session=xyz; other=abc")).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(parseCsrfCookie("")).toBeNull();
  });

  it("não confunde csrf_token_extra com csrf_token", () => {
    expect(parseCsrfCookie("csrf_token_extra=wrong")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateCsrfRequest — helper para criar Request
// ---------------------------------------------------------------------------

function makeRequest(
  cookie: string | null,
  csrfHeader: string | null
): Request {
  const headers = new Headers();
  if (cookie !== null)     headers.set("cookie", cookie);
  if (csrfHeader !== null) headers.set("x-csrf-token", csrfHeader);
  return new Request("http://localhost/api/test", {
    method: "DELETE",
    headers,
  });
}

describe("validateCsrfRequest", () => {
  const TOKEN = "abcdef1234567890abcdef1234567890";

  it("aceita quando cookie e header têm o mesmo token", () => {
    const req = makeRequest(`csrf_token=${TOKEN}`, TOKEN);
    expect(validateCsrfRequest(req)).toBe(true);
  });

  it("rejeita quando header está ausente", () => {
    const req = makeRequest(`csrf_token=${TOKEN}`, null);
    expect(validateCsrfRequest(req)).toBe(false);
  });

  it("rejeita quando cookie está ausente", () => {
    const req = makeRequest(null, TOKEN);
    expect(validateCsrfRequest(req)).toBe(false);
  });

  it("rejeita quando tokens são diferentes", () => {
    const req = makeRequest(`csrf_token=${TOKEN}`, TOKEN + "x");
    expect(validateCsrfRequest(req)).toBe(false);
  });

  it("rejeita header vazio", () => {
    const req = makeRequest(`csrf_token=${TOKEN}`, "");
    expect(validateCsrfRequest(req)).toBe(false);
  });

  it("rejeita cookie vazio", () => {
    const req = makeRequest("csrf_token=", TOKEN);
    expect(validateCsrfRequest(req)).toBe(false);
  });

  it("rejeita ambos ausentes", () => {
    const req = makeRequest(null, null);
    expect(validateCsrfRequest(req)).toBe(false);
  });

  it("é case-sensitive nos tokens", () => {
    const req = makeRequest(
      `csrf_token=${TOKEN.toUpperCase()}`,
      TOKEN.toLowerCase()
    );
    expect(validateCsrfRequest(req)).toBe(false);
  });

  it("suporta tokens UUID sem hífens (formato do middleware)", () => {
    const uuid = "550e8400e29b41d4a716446655440000"; // 32 chars hex
    const req = makeRequest(`csrf_token=${uuid}`, uuid);
    expect(validateCsrfRequest(req)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// redact utility — importado de server/lib/redact
// ---------------------------------------------------------------------------

import { redact, redactEmail, redactIp } from "@/server/lib/redact";

describe("redact", () => {
  it("oculta qualquer string", () => {
    expect(redact("super-secret-token")).toBe("[REDACTED]");
    expect(redact("")).toBe("[REDACTED]");
  });
});

describe("redactEmail", () => {
  it("preserva primeiro char e domínio", () => {
    expect(redactEmail("user@example.com")).toBe("u***@example.com");
  });

  it("retorna REDACTED para email sem @", () => {
    expect(redactEmail("invalidemail")).toBe("[REDACTED]");
  });

  it("retorna REDACTED para @ na primeira posição", () => {
    expect(redactEmail("@example.com")).toBe("[REDACTED]");
  });
});

describe("redactIp", () => {
  it("redaciona dois últimos octetos de IPv4", () => {
    expect(redactIp("192.168.1.100")).toBe("192.168.x.x");
  });

  it("preserva 'unknown'", () => {
    expect(redactIp("unknown")).toBe("unknown");
  });

  it("preserva string vazia", () => {
    expect(redactIp("")).toBe("");
  });

  it("redaciona IPv6", () => {
    expect(redactIp("2001:db8::1")).toBe("2001:db8::x");
  });
});
