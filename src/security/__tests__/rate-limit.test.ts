/**
 * Testes unitários — rate-limit (memory store)
 * Executar com: pnpm test:unit
 */
import { rateLimit, RateLimitError } from "@/security/rate-limit/rate-limit";
import { memoryStore } from "@/security/rate-limit/stores/memory-store";
import {
  loginIpKey,
  inviteKey,
  mutationKey,
  getClientIp,
} from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

const KEY = "test:unit:key";
const OPTS = { limit: 3, windowMs: 60_000 };

beforeEach(async () => {
  await memoryStore.reset(KEY);
});

describe("rateLimit() com memory store", () => {
  it("primeiro request retorna ok=true e remaining = limit - 1", async () => {
    const result = await rateLimit(KEY, OPTS, memoryStore);

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.resetAt).toBeInstanceOf(Date);
  });

  it("requests dentro do limite retornam ok=true com remaining decrescente", async () => {
    const r1 = await rateLimit(KEY, OPTS, memoryStore);
    const r2 = await rateLimit(KEY, OPTS, memoryStore);
    const r3 = await rateLimit(KEY, OPTS, memoryStore);

    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(1);
    expect(r3.ok).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("request após estouro do limite retorna ok=false, remaining=0", async () => {
    // Esgota os 3 slots
    await rateLimit(KEY, OPTS, memoryStore);
    await rateLimit(KEY, OPTS, memoryStore);
    await rateLimit(KEY, OPTS, memoryStore);

    // 4º request deve ser bloqueado
    const blocked = await rateLimit(KEY, OPTS, memoryStore);

    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("após expirar a janela, o contador é resetado", async () => {
    // Satura o bucket
    await rateLimit(KEY, OPTS, memoryStore);
    await rateLimit(KEY, OPTS, memoryStore);
    await rateLimit(KEY, OPTS, memoryStore);
    const blocked = await rateLimit(KEY, OPTS, memoryStore);
    expect(blocked.ok).toBe(false);

    // Simula janela expirada resetando o store
    await memoryStore.reset(KEY);

    // Agora deve funcionar de novo
    const fresh = await rateLimit(KEY, OPTS, memoryStore);
    expect(fresh.ok).toBe(true);
    expect(fresh.remaining).toBe(2);
  });

  it("resetAt é no futuro (dentro da janela)", async () => {
    const before = Date.now();
    const result = await rateLimit(KEY, OPTS, memoryStore);
    const after = Date.now();

    expect(result.resetAt.getTime()).toBeGreaterThan(before + OPTS.windowMs - 10);
    expect(result.resetAt.getTime()).toBeLessThanOrEqual(after + OPTS.windowMs);
  });
});

describe("builders de chave (keys.ts)", () => {
  it("loginIpKey gera chave correta", () => {
    expect(loginIpKey("1.2.3.4")).toBe("rl:login:ip:1.2.3.4");
  });

  it("inviteKey gera chave correta", () => {
    expect(inviteKey("org_abc", "usr_xyz")).toBe("rl:invite:org_abc:usr_xyz");
  });

  it("mutationKey gera chave correta", () => {
    expect(mutationKey("org_abc", "usr_xyz")).toBe("rl:mutation:org_abc:usr_xyz");
  });

  it("chaves diferentes não interferem entre si", async () => {
    const key1 = "test:key1";
    const key2 = "test:key2";
    await memoryStore.reset(key1);
    await memoryStore.reset(key2);

    await rateLimit(key1, { limit: 1, windowMs: 60_000 }, memoryStore);
    const r1blocked = await rateLimit(key1, { limit: 1, windowMs: 60_000 }, memoryStore);
    const r2ok = await rateLimit(key2, { limit: 1, windowMs: 60_000 }, memoryStore);

    expect(r1blocked.ok).toBe(false);
    expect(r2ok.ok).toBe(true);

    await memoryStore.reset(key1);
    await memoryStore.reset(key2);
  });
});

describe("getClientIp()", () => {
  it("extrai primeiro IP do header x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("retorna 'unknown' quando header ausente", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("lida com IP único sem vírgula", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });
});

describe("RATE_LIMITS constants", () => {
  it("LOGIN_IP: 10 req / 60s", () => {
    expect(RATE_LIMITS.LOGIN_IP).toEqual({ limit: 10, windowMs: 60_000 });
  });

  it("INVITE: 20 req / 3600s", () => {
    expect(RATE_LIMITS.INVITE).toEqual({ limit: 20, windowMs: 3_600_000 });
  });

  it("MUTATIONS: 120 req / 60s", () => {
    expect(RATE_LIMITS.MUTATIONS).toEqual({ limit: 120, windowMs: 60_000 });
  });
});
