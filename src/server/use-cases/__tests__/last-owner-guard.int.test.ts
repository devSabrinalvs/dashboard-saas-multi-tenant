/**
 * Testes de integração — lastOwnerGuard com banco real
 * Executar com: pnpm test:int
 */
import { lastOwnerGuard } from "@/server/use-cases/_guards/last-owner-guard";
import { LastOwnerError } from "@/server/errors/team-errors";
import { Role } from "@/generated/prisma/enums";
import {
  testPrisma,
  resetDb,
  createTestUser,
  createOrgWithMembership,
} from "@tests/helpers/db";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe("lastOwnerGuard() — integração com banco", () => {
  it("não lança quando org tem 2 OWNERs", async () => {
    const user1 = await createTestUser("u1@test.com");
    const org = await createOrgWithMembership(user1.id, "org-a", Role.OWNER);
    const user2 = await createTestUser("u2@test.com");
    await testPrisma.membership.create({
      data: { userId: user2.id, orgId: org.id, role: Role.OWNER },
    });

    await expect(lastOwnerGuard(org.id)).resolves.toBeUndefined();
  });

  it("lança LastOwnerError quando org tem 1 OWNER", async () => {
    const user = await createTestUser("owner@test.com");
    const org = await createOrgWithMembership(user.id, "org-b", Role.OWNER);

    await expect(lastOwnerGuard(org.id)).rejects.toBeInstanceOf(LastOwnerError);
  });
});
