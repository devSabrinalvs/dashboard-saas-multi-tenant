/**
 * Matriz de permissões por role.
 * Fonte única da verdade para controle de acesso no sistema.
 *
 * Hierarquia:
 *  OWNER  → tudo
 *  ADMIN  → tudo exceto billing:manage
 *  MEMBER → conteúdo (projects + tasks), sem gestão de membros e sem audit
 *  VIEWER → somente leitura (nenhuma das permissões listadas)
 */
import type { Role } from "@/generated/prisma/enums";
import type { Permission } from "./permissions";

const OWNER_PERMISSIONS = new Set<Permission>([
  "member:invite",
  "member:remove",
  "member:role:update",
  "project:create",
  "project:update",
  "project:delete",
  "task:create",
  "task:update",
  "task:delete",
  "audit:read",
  "billing:manage",
]);

const ADMIN_PERMISSIONS = new Set<Permission>([
  "member:invite",
  "member:remove",
  "member:role:update",
  "project:create",
  "project:update",
  "project:delete",
  "task:create",
  "task:update",
  "task:delete",
  "audit:read",
  // billing:manage: excluído — apenas OWNER
]);

const MEMBER_PERMISSIONS = new Set<Permission>([
  "project:create",
  "project:update",
  "project:delete",
  "task:create",
  "task:update",
  "task:delete",
]);

const VIEWER_PERMISSIONS = new Set<Permission>();

const ROLE_MATRIX: Record<Role, ReadonlySet<Permission>> = {
  OWNER: OWNER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  MEMBER: MEMBER_PERMISSIONS,
  VIEWER: VIEWER_PERMISSIONS,
};

/**
 * Verifica se um role tem uma permissão específica.
 *
 * @example
 * can("OWNER", "billing:manage") // true
 * can("MEMBER", "member:invite") // false
 */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_MATRIX[role].has(permission);
}
