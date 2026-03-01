/**
 * Testes de integração — requireOrgContext
 *
 * Usa jest.unstable_mockModule() + dynamic import (padrão correto para Jest ESM).
 * jest.mock() não funciona neste caso: em ESM, o grafo de módulos é linkado
 * ANTES do código rodar, então mocks estáticos não impedem dependências de serem
 * carregadas. Com unstable_mockModule + import dinâmico, o mock é registrado
 * ANTES do módulo ser resolvido.
 *
 * Requer banco de testes ativo (DATABASE_URL em .env.test).
 * Executar com: pnpm test:int
 */
// Em modo ESM, `jest` não é injetado automaticamente como global —
// precisa ser importado explicitamente de @jest/globals.
import { jest } from "@jest/globals";
import type { OrgContext } from "@/server/org/require-org-context";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
} from "@tests/helpers/db";
import { Role } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Erro que simula o comportamento de notFound() do Next.js
// ---------------------------------------------------------------------------
class NotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
    this.name = "NotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Módulos carregados dinamicamente após os mocks serem registrados
// ---------------------------------------------------------------------------
let requireOrgContext: (slug: string) => Promise<OrgContext>;
let mockRequireAuth: ReturnType<typeof jest.fn>;
let mockNotFound: ReturnType<typeof jest.fn>;

// ---------------------------------------------------------------------------
// Setup: registra mocks ANTES do import dinâmico do módulo sob teste
// ---------------------------------------------------------------------------
beforeAll(async () => {
  mockRequireAuth = jest.fn();
  mockNotFound = jest.fn(() => {
    throw new NotFoundError();
  });

  // jest.unstable_mockModule intercepta o módulo ANTES de ser carregado
  // pelo import dinâmico abaixo — a corrente @/auth → options.ts nunca roda
  await jest.unstable_mockModule("@/server/auth/require-auth", () => ({
    requireAuth: mockRequireAuth,
  }));

  await jest.unstable_mockModule("next/navigation", () => ({
    notFound: mockNotFound,
    redirect: jest.fn(),
  }));

  // Import dinâmico APÓS os mocks: require-org-context receberá os mocks
  const mod = await import("@/server/org/require-org-context");
  requireOrgContext = mod.requireOrgContext;
});

beforeEach(async () => {
  await resetDb();
  jest.clearAllMocks();
  // clearAllMocks limpa calls/instances mas não implementação; restauramos notFound
  mockNotFound.mockImplementation(() => {
    throw new NotFoundError();
  });
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("requireOrgContext()", () => {
  it("retorna contexto completo quando usuário é membro da org", async () => {
    const user = await createTestUser("member@test.com");
    const org = await createOrgWithMembership(user.id, "org-ctx", Role.OWNER);

    mockRequireAuth.mockResolvedValue({ userId: user.id, email: user.email });

    const ctx = await requireOrgContext(org.slug);

    expect(ctx.userId).toBe(user.id);
    expect(ctx.email).toBe(user.email);
    expect(ctx.orgId).toBe(org.id);
    expect(ctx.orgSlug).toBe(org.slug);
    expect(ctx.orgName).toBe(org.name);
    expect(ctx.role).toBe(Role.OWNER);
  });

  it("lança NotFoundError quando usuário não tem membership na org", async () => {
    const user = await createTestUser("no-member@test.com");
    const orgOwner = await createTestUser("org-owner@test.com");
    const org = await createOrgWithMembership(
      orgOwner.id,
      "org-private",
      Role.OWNER
    );

    mockRequireAuth.mockResolvedValue({ userId: user.id, email: user.email });

    await expect(requireOrgContext(org.slug)).rejects.toThrow("NOT_FOUND");
  });

  it("lança NotFoundError quando a org não existe", async () => {
    const user = await createTestUser("ghost-org@test.com");

    mockRequireAuth.mockResolvedValue({ userId: user.id, email: user.email });

    await expect(requireOrgContext("org-que-nao-existe")).rejects.toThrow(
      "NOT_FOUND"
    );
  });

  it("retorna role correto para membro VIEWER", async () => {
    const user = await createTestUser("viewer@test.com");
    const org = await createOrgWithMembership(
      user.id,
      "org-viewer",
      Role.VIEWER
    );

    mockRequireAuth.mockResolvedValue({ userId: user.id, email: user.email });

    const ctx = await requireOrgContext(org.slug);

    expect(ctx.role).toBe(Role.VIEWER);
  });

  it("retorna role correto para membro MEMBER", async () => {
    const user = await createTestUser("just-member@test.com");
    const org = await createOrgWithMembership(
      user.id,
      "org-member",
      Role.MEMBER
    );

    mockRequireAuth.mockResolvedValue({ userId: user.id, email: user.email });

    const ctx = await requireOrgContext(org.slug);

    expect(ctx.role).toBe(Role.MEMBER);
  });
});
