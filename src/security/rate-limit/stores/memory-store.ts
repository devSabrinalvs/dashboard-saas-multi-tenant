/**
 * Store de rate limiting in-memory (Map).
 *
 * Usado em desenvolvimento e nos testes unitários.
 * NÃO persiste entre reinicializações do servidor.
 * NÃO é compartilhado entre múltiplas instâncias (não usar em prod multi-instance).
 */

export interface RateLimitStore {
  /**
   * Incrementa o contador para a chave dada.
   * Se a janela tiver expirado (ou não existir), reinicia com count=1.
   * Retorna o estado APÓS o incremento.
   */
  increment(
    key: string,
    windowMs: number
  ): Promise<{ count: number; windowStart: Date }>;

  /**
   * Reseta o bucket para a chave — útil em testes.
   */
  reset(key: string): Promise<void>;
}

interface Bucket {
  count: number;
  windowStart: number; // timestamp em ms
}

const store = new Map<string, Bucket>();

export const memoryStore: RateLimitStore = {
  async increment(key, windowMs) {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      const bucket: Bucket = { count: 1, windowStart: now };
      store.set(key, bucket);
      return { count: 1, windowStart: new Date(now) };
    }

    existing.count += 1;
    return { count: existing.count, windowStart: new Date(existing.windowStart) };
  },

  async reset(key) {
    store.delete(key);
  },
};
