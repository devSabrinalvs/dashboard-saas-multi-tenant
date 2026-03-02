// Unit test para lastOwnerGuard.
// Usa injeção de dependência — sem banco real, sem jest.unstable_mockModule.
import { lastOwnerGuard } from "@/server/use-cases/_guards/last-owner-guard";
import { LastOwnerError } from "@/server/errors/team-errors";

describe("lastOwnerGuard()", () => {
  it("não lança quando a org tem 2 owners", async () => {
    const countFn = async () => 2;
    await expect(lastOwnerGuard("org-1", countFn)).resolves.toBeUndefined();
  });

  it("não lança quando a org tem 3 ou mais owners", async () => {
    const countFn = async () => 5;
    await expect(lastOwnerGuard("org-1", countFn)).resolves.toBeUndefined();
  });

  it("lança LastOwnerError quando a org tem exatamente 1 owner", async () => {
    const countFn = async () => 1;
    await expect(lastOwnerGuard("org-1", countFn)).rejects.toBeInstanceOf(
      LastOwnerError
    );
  });

  it("LastOwnerError.status === 422", async () => {
    const countFn = async () => 1;
    const error = await lastOwnerGuard("org-1", countFn).catch(
      (e: unknown) => e
    );
    expect((error as LastOwnerError).status).toBe(422);
  });
});
