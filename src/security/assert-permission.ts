import type { OrgContext } from "@/server/org/require-org-context";
import type { Permission } from "./permissions";
import { can } from "./rbac";

/**
 * Lançada quando um usuário tenta executar uma ação sem a permissão necessária.
 * Status 403 é usado nos route handlers para retornar a resposta correta.
 */
export class PermissionDeniedError extends Error {
  readonly status = 403;

  constructor(permission: Permission) {
    super(`Permission denied: ${permission}`);
    this.name = "PermissionDeniedError";
    // Necessário para que instanceof funcione corretamente com target ES2017
    Object.setPrototypeOf(this, PermissionDeniedError.prototype);
  }
}

/**
 * Verifica se o usuário no contexto tem a permissão requerida.
 * Lança PermissionDeniedError se não tiver.
 *
 * A segurança é garantida server-side; a UI é apenas hint visual.
 *
 * @example
 * const ctx = await requireOrgContext(orgSlug);
 * assertPermission(ctx, "project:create");
 */
export function assertPermission(
  ctx: OrgContext,
  permission: Permission
): void {
  if (!can(ctx.role, permission)) {
    throw new PermissionDeniedError(permission);
  }
}
