/**
 * Testes de integração — rate-limit (prisma store)
 * Executar com: pnpm test:int
 */
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { prismaStore } from "@/security/rate-limit/stores/prisma-store";
import { testPrisma, resetDb } from "@tests/helpers/db";

const KEY = "int:test:rate-limit";
const OPTS = { limit: 3, windowMs: 60_000 };

beforeEach(async () => {
  await testPrisma.$executeRaw`DELETE FROM "RateLimitBucket"`;
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("prismaStore.increment()", () => {
  it("cria bucket no DB no primeiro request", async () => {
    const result = await prismaStore.increment(KEY, OPTS.windowMs);

    expect(result.count).toBe(1);
    expect(result.windowStart).toBeInstanceOf(Date);

    const bucket = await testPrisma.rateLimitBucket.findUnique({ where: { key: KEY } });
    expect(bucket).not.toBeNull();
    expect(bucket?.count).toBe(1);
  });

  it("incrementa count em requests subsequentes na mesma janela", async () => {
    await prismaStore.increment(KEY, OPTS.windowMs);
    await prismaStore.increment(KEY, OPTS.windowMs);
    const third = await prismaStore.increment(KEY, OPTS.windowMs);

    expect(third.count).toBe(3);

    const bucket = await testPrisma.rateLimitBucket.findUnique({ where: { key: KEY } });
    expect(bucket?.count).toBe(3);
  });

  it("reseta o bucket quando a janela expira", async () => {
    // Cria um bucket saturado
    await prismaStore.increment(KEY, OPTS.windowMs);
    await prismaStore.increment(KEY, OPTS.windowMs);
    await prismaStore.increment(KEY, OPTS.windowMs);

    // Simula janela expirada: move windowStart para o passado
    const pastStart = new Date(Date.now() - OPTS.windowMs - 1000);
    await testPrisma.rateLimitBucket.update({
      where: { key: KEY },
      data: { windowStart: pastStart },
    });

    // Novo request deve reiniciar o bucket
    const result = await prismaStore.increment(KEY, OPTS.windowMs);
    expect(result.count).toBe(1);

    const bucket = await testPrisma.rateLimitBucket.findUnique({ where: { key: KEY } });
    expect(bucket?.count).toBe(1);
  });
});

describe("rateLimit() com prismaStore", () => {
  it("bloqueia após estouro do limite", async () => {
    // Esgota os 3 slots
    await rateLimit(KEY, OPTS, prismaStore);
    await rateLimit(KEY, OPTS, prismaStore);
    await rateLimit(KEY, OPTS, prismaStore);

    // 4º deve ser bloqueado
    const blocked = await rateLimit(KEY, OPTS, prismaStore);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("duas 'instâncias' (chamadas em sequência) compartilham o mesmo bucket no DB", async () => {
    // Simula dois workers/instâncias usando a mesma chave
    const r1 = await rateLimit(KEY, OPTS, prismaStore);
    const r2 = await rateLimit(KEY, OPTS, prismaStore);

    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);

    const bucket = await testPrisma.rateLimitBucket.findUnique({ where: { key: KEY } });
    expect(bucket?.count).toBe(2);
  });

  it("chaves diferentes têm buckets independentes no DB", async () => {
    const key1 = "int:key1";
    const key2 = "int:key2";

    await rateLimit(key1, { limit: 1, windowMs: 60_000 }, prismaStore);
    const key1Blocked = await rateLimit(key1, { limit: 1, windowMs: 60_000 }, prismaStore);
    const key2Ok = await rateLimit(key2, { limit: 1, windowMs: 60_000 }, prismaStore);

    expect(key1Blocked.ok).toBe(false);
    expect(key2Ok.ok).toBe(true);
  });
});
