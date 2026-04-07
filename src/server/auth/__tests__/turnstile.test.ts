/**
 * Testes unitários — verifyTurnstile (turnstile.ts)
 * Mock de fetch para evitar chamadas reais à API do Cloudflare.
 */
import { verifyTurnstile } from "@/server/auth/turnstile";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  delete process.env.TURNSTILE_SECRET_KEY;
});

describe("verifyTurnstile() — sem TURNSTILE_SECRET_KEY", () => {
  it("retorna true sem chamar fetch (graceful degradation)", async () => {
    const result = await verifyTurnstile("qualquer-token");
    expect(result).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("verifyTurnstile() — com TURNSTILE_SECRET_KEY", () => {
  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret-key";
  });

  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  function mockResponse(body: object, ok = true) {
    mockFetch.mockResolvedValueOnce({
      ok,
      json: async () => body,
    });
  }

  it("retorna true quando Cloudflare responde success: true", async () => {
    mockResponse({
      success: true,
      "error-codes": [],
      challenge_ts: "2024-01-01T00:00:00Z",
      hostname: "localhost",
    });

    const result = await verifyTurnstile("valid-token");
    expect(result).toBe(true);
  });

  it("retorna false quando Cloudflare responde success: false", async () => {
    mockResponse({
      success: false,
      "error-codes": ["invalid-input-response"],
      challenge_ts: "2024-01-01T00:00:00Z",
      hostname: "localhost",
    });

    const result = await verifyTurnstile("invalid-token");
    expect(result).toBe(false);
  });

  it("retorna false quando fetch retorna ok: false (HTTP error)", async () => {
    mockResponse({}, false);
    const result = await verifyTurnstile("any-token");
    expect(result).toBe(false);
  });

  it("chama a URL correta do Cloudflare com POST", async () => {
    mockResponse({ success: true, "error-codes": [], challenge_ts: "", hostname: "" });
    await verifyTurnstile("my-token");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("envia secret e response no corpo da requisição", async () => {
    mockResponse({ success: true, "error-codes": [], challenge_ts: "", hostname: "" });
    await verifyTurnstile("user-token-abc");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.body).toContain("secret=test-secret-key");
    expect(options.body).toContain("response=user-token-abc");
  });
});
