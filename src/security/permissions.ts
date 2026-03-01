/**
 * Union de todas as permissões disponíveis no sistema.
 * Cada string representa uma ação específica que pode ser verificada via can().
 */
export type Permission =
  | "member:invite"
  | "member:remove"
  | "member:role:update"
  | "project:create"
  | "project:update"
  | "project:delete"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "audit:read"
  | "billing:manage";
