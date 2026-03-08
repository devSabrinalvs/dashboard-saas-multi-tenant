import { memoryStore, type RateLimitStore } from "./stores/memory-store";

export type { RateLimitStore };

/**
 * Erro lançado quando o rate limit é excedido.
 * status 429 — pode ser capturado em route handlers.
 */
export class RateLimitError extends Error {
  readonly status = 429;

  constructor(public readonly resetAt: Date) {
    super("Too many requests.");
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Requisições restantes na janela atual. */
  remaining: number;
  /** Momento em que a janela atual expira (para o header Retry-After). */
  resetAt: Date;
}

/**
 * Aplica rate limiting de janela fixa (fixed window).
 *
 * @param key     - Chave única do bucket (use os builders de `keys.ts`)
 * @param opts    - Limite e duração da janela
 * @param store   - Store a usar. Default: memory em dev/test, prisma em prod.
 *
 * @example
 * const rl = await rateLimit(mutationKey(ctx.orgId, ctx.userId), RATE_LIMITS.MUTATIONS);
 * if (!rl.ok) return NextResponse.json({ error: "Muitas requisições", resetAt: rl.resetAt }, { status: 429 });
 */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
  store?: RateLimitStore
): Promise<RateLimitResult> {
  let activeStore = store;
  if (!activeStore) {
    if (process.env.NODE_ENV === "production") {
      const { prismaStore } = await import("./stores/prisma-store");
      activeStore = prismaStore;
    } else {
      activeStore = memoryStore;
    }
  }

  const { count, windowStart } = await activeStore.increment(key, opts.windowMs);
  const resetAt = new Date(windowStart.getTime() + opts.windowMs);
  const remaining = Math.max(0, opts.limit - count);
  const ok = count <= opts.limit;

  return { ok, remaining, resetAt };
}
