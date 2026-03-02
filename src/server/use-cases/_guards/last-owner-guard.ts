import { countOwners } from "@/server/repo/membership-repo";
import { LastOwnerError } from "@/server/errors/team-errors";

/**
 * Lança LastOwnerError se a org possuir apenas um OWNER.
 * Deve ser chamado antes de qualquer operação que remova ou rebaixe um OWNER.
 *
 * @param orgId - id da organização
 * @param countOwnersFn - função injetável para testes (padrão: countOwners do repo)
 */
export async function lastOwnerGuard(
  orgId: string,
  countOwnersFn: (orgId: string) => Promise<number> = countOwners
): Promise<void> {
  const ownerCount = await countOwnersFn(orgId);
  if (ownerCount <= 1) {
    throw new LastOwnerError();
  }
}
