/**
 * Store de rate limiting com PostgreSQL via Prisma.
 *
 * Usado em produção. Persiste entre reinicializações e é compartilhado
 * entre múltiplas instâncias do servidor.
 *
 * Limitação: não é totalmente atômico (sem SELECT FOR UPDATE).
 * Race conditions são improváveis dado os limites configurados (120/min).
 */
import { prisma } from "@/lib/prisma";
import type { RateLimitStore } from "./memory-store";

export const prismaStore: RateLimitStore = {
  async increment(key, windowMs) {
    const now = new Date();
    const windowCutoff = new Date(now.getTime() - windowMs);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimitBucket.findUnique({ where: { key } });

      if (!existing) {
        const created = await tx.rateLimitBucket.create({
          data: { key, count: 1, windowStart: now },
        });
        return { count: created.count, windowStart: created.windowStart };
      }

      if (existing.windowStart <= windowCutoff) {
        // Janela expirou: reinicia o bucket
        const updated = await tx.rateLimitBucket.update({
          where: { key },
          data: { count: 1, windowStart: now },
        });
        return { count: updated.count, windowStart: updated.windowStart };
      }

      // Janela ainda ativa: incrementa
      const updated = await tx.rateLimitBucket.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
      return { count: updated.count, windowStart: updated.windowStart };
    });
  },

  async reset(key) {
    await prisma.rateLimitBucket.deleteMany({ where: { key } });
  },
};
