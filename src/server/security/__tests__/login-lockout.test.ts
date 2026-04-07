/**
 * Testes unitários — helpers de lockout de login (login-lockout.ts)
 * Sem dependências de banco — apenas lógica pura.
 */

import {
  getLockDurationMs,
  computeLockedUntil,
  isAccountLocked,
  getLockRemainingMs,
  formatLockDuration,
  LOCK_THRESHOLDS,
} from "@/server/security/login-lockout";

// ---------------------------------------------------------------------------
// getLockDurationMs
// ---------------------------------------------------------------------------

describe("getLockDurationMs", () => {
  it("retorna 0 para 0 falhas (sem bloqueio)", () => {
    expect(getLockDurationMs(0)).toBe(0);
  });

  it("retorna 0 para menos de 5 falhas (threshold mínimo)", () => {
    expect(getLockDurationMs(1)).toBe(0);
    expect(getLockDurationMs(4)).toBe(0);
  });

  it("retorna 5 min (300_000 ms) para exatamente 5 falhas", () => {
    expect(getLockDurationMs(5)).toBe(5 * 60 * 1000);
  });

  it("retorna 5 min para 6 e 7 falhas (entre thresholds)", () => {
    expect(getLockDurationMs(6)).toBe(5 * 60 * 1000);
    expect(getLockDurationMs(7)).toBe(5 * 60 * 1000);
  });

  it("retorna 15 min (900_000 ms) para exatamente 8 falhas", () => {
    expect(getLockDurationMs(8)).toBe(15 * 60 * 1000);
  });

  it("retorna 15 min para 9 falhas (entre thresholds)", () => {
    expect(getLockDurationMs(9)).toBe(15 * 60 * 1000);
  });

  it("retorna 60 min (3_600_000 ms) para exatamente 10 falhas", () => {
    expect(getLockDurationMs(10)).toBe(60 * 60 * 1000);
  });

  it("retorna 60 min para mais de 10 falhas (cap máximo)", () => {
    expect(getLockDurationMs(20)).toBe(60 * 60 * 1000);
    expect(getLockDurationMs(100)).toBe(60 * 60 * 1000);
  });

  it("thresholds estão em ordem crescente de failCount", () => {
    for (let i = 1; i < LOCK_THRESHOLDS.length; i++) {
      expect(LOCK_THRESHOLDS[i].failCount).toBeGreaterThan(LOCK_THRESHOLDS[i - 1].failCount);
    }
  });
});

// ---------------------------------------------------------------------------
// computeLockedUntil
// ---------------------------------------------------------------------------

describe("computeLockedUntil", () => {
  it("retorna null se falhas abaixo do threshold mínimo", () => {
    expect(computeLockedUntil(0)).toBeNull();
    expect(computeLockedUntil(4)).toBeNull();
  });

  it("retorna Date correta para 5 falhas (5 min)", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const result = computeLockedUntil(5, now);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(now.getTime() + 5 * 60 * 1000);
  });

  it("retorna Date correta para 8 falhas (15 min)", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const result = computeLockedUntil(8, now);
    expect(result!.getTime()).toBe(now.getTime() + 15 * 60 * 1000);
  });

  it("retorna Date correta para 10 falhas (60 min)", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const result = computeLockedUntil(10, now);
    expect(result!.getTime()).toBe(now.getTime() + 60 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// isAccountLocked
// ---------------------------------------------------------------------------

describe("isAccountLocked", () => {
  it("retorna false para null", () => {
    expect(isAccountLocked(null)).toBe(false);
  });

  it("retorna false para undefined", () => {
    expect(isAccountLocked(undefined)).toBe(false);
  });

  it("retorna false para data no passado", () => {
    const past = new Date(Date.now() - 1000);
    expect(isAccountLocked(past)).toBe(false);
  });

  it("retorna true para data no futuro", () => {
    const future = new Date(Date.now() + 5 * 60 * 1000);
    expect(isAccountLocked(future)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getLockRemainingMs
// ---------------------------------------------------------------------------

describe("getLockRemainingMs", () => {
  it("retorna 0 para null", () => {
    expect(getLockRemainingMs(null)).toBe(0);
  });

  it("retorna 0 para data no passado", () => {
    const past = new Date(Date.now() - 1000);
    expect(getLockRemainingMs(past)).toBe(0);
  });

  it("retorna ms restantes para data no futuro (com tolerância de 50ms)", () => {
    const future = new Date(Date.now() + 5 * 60 * 1000);
    const remaining = getLockRemainingMs(future);
    expect(remaining).toBeGreaterThan(5 * 60 * 1000 - 50);
    expect(remaining).toBeLessThanOrEqual(5 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// formatLockDuration
// ---------------------------------------------------------------------------

describe("formatLockDuration", () => {
  it("formata 0 como '0 min'", () => {
    expect(formatLockDuration(0)).toBe("0 min");
  });

  it("formata menos de 60 min em minutos", () => {
    expect(formatLockDuration(5 * 60 * 1000)).toBe("5 min");
    expect(formatLockDuration(15 * 60 * 1000)).toBe("15 min");
    expect(formatLockDuration(59 * 60 * 1000)).toBe("59 min");
  });

  it("formata exatamente 1 hora sem minutos", () => {
    expect(formatLockDuration(60 * 60 * 1000)).toBe("1 h");
  });

  it("formata horas com minutos restantes", () => {
    expect(formatLockDuration(90 * 60 * 1000)).toBe("1 h 30 min");
    expect(formatLockDuration(125 * 60 * 1000)).toBe("2 h 5 min");
  });

  it("arredonda para cima (ceil) o número de minutos", () => {
    // 4 min e 30 seg → 5 min (ceil)
    expect(formatLockDuration(4 * 60 * 1000 + 30 * 1000)).toBe("5 min");
  });
});
