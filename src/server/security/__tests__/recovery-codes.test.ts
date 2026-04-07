/**
 * Testes unitários — recovery-codes.ts
 */

import {
  generateRecoveryCodes,
  hashRecoveryCode,
  hashRecoveryCodes,
  findMatchingRecoveryCodeHash,
} from "@/server/security/recovery-codes";

// ---------------------------------------------------------------------------
// generateRecoveryCodes
// ---------------------------------------------------------------------------

describe("generateRecoveryCodes", () => {
  it("gera exatamente 8 códigos", () => {
    expect(generateRecoveryCodes()).toHaveLength(8);
  });

  it("cada código segue o formato XXXX-XXXX (hex uppercase)", () => {
    const codes = generateRecoveryCodes();
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    }
  });

  it("gera códigos únicos a cada chamada", () => {
    const setA = new Set(generateRecoveryCodes());
    const setB = new Set(generateRecoveryCodes());
    // Probabilidade extremamente baixa de colisão
    const intersection = [...setA].filter((c) => setB.has(c));
    expect(intersection).toHaveLength(0);
  });

  it("não gera duplicatas dentro do mesmo set", () => {
    const codes = generateRecoveryCodes();
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});

// ---------------------------------------------------------------------------
// hashRecoveryCode
// ---------------------------------------------------------------------------

describe("hashRecoveryCode", () => {
  it("retorna string hex de 64 chars (SHA-256)", () => {
    const hash = hashRecoveryCode("ABCD-1234");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("normaliza hífens — 'ABCD-1234' e 'ABCD1234' produzem o mesmo hash", () => {
    expect(hashRecoveryCode("ABCD-1234")).toBe(hashRecoveryCode("ABCD1234"));
  });

  it("normaliza para uppercase — 'abcd-1234' e 'ABCD-1234' produzem o mesmo hash", () => {
    expect(hashRecoveryCode("abcd-1234")).toBe(hashRecoveryCode("ABCD-1234"));
  });

  it("hashes diferentes para códigos diferentes", () => {
    expect(hashRecoveryCode("AAAA-BBBB")).not.toBe(hashRecoveryCode("CCCC-DDDD"));
  });

  it("é determinístico (mesmo input → mesmo output)", () => {
    const code = "1A2B-3C4D";
    expect(hashRecoveryCode(code)).toBe(hashRecoveryCode(code));
  });
});

// ---------------------------------------------------------------------------
// hashRecoveryCodes
// ---------------------------------------------------------------------------

describe("hashRecoveryCodes", () => {
  it("retorna array com mesmo comprimento", () => {
    const codes = generateRecoveryCodes();
    expect(hashRecoveryCodes(codes)).toHaveLength(codes.length);
  });

  it("cada elemento é um hash SHA-256", () => {
    const codes = ["AAAA-BBBB", "CCCC-DDDD"];
    const hashes = hashRecoveryCodes(codes);
    for (const h of hashes) {
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// findMatchingRecoveryCodeHash
// ---------------------------------------------------------------------------

describe("findMatchingRecoveryCodeHash", () => {
  it("encontra o hash correspondente ao código correto", () => {
    const codes = generateRecoveryCodes();
    const hashes = hashRecoveryCodes(codes);

    const matchHash = findMatchingRecoveryCodeHash(codes[0], hashes);
    expect(matchHash).toBe(hashes[0]);
  });

  it("retorna null para código inválido", () => {
    const hashes = hashRecoveryCodes(["AAAA-BBBB"]);
    expect(findMatchingRecoveryCodeHash("ZZZZ-ZZZZ", hashes)).toBeNull();
  });

  it("aceita código sem hífen (normalização)", () => {
    const code = "ABCD1234";
    const hashes = hashRecoveryCodes(["ABCD-1234"]);
    expect(findMatchingRecoveryCodeHash(code, hashes)).not.toBeNull();
  });

  it("aceita código lowercase (normalização)", () => {
    const code = "abcd-1234";
    const hashes = hashRecoveryCodes(["ABCD-1234"]);
    expect(findMatchingRecoveryCodeHash(code, hashes)).not.toBeNull();
  });

  it("retorna null para lista de hashes vazia", () => {
    expect(findMatchingRecoveryCodeHash("AAAA-BBBB", [])).toBeNull();
  });
});
