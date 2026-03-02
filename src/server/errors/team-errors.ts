/**
 * Erros de domínio para operações de equipe (convites, membros, roles).
 * Cada classe expõe `.status` para mapeamento direto em route handlers.
 */

export class InviteDuplicateError extends Error {
  readonly status = 409;
  constructor() {
    super("Já existe um convite pendente para este email.");
    this.name = "InviteDuplicateError";
    Object.setPrototypeOf(this, InviteDuplicateError.prototype);
  }
}

export class InviteNotFoundError extends Error {
  readonly status = 404;
  constructor() {
    super("Convite não encontrado.");
    this.name = "InviteNotFoundError";
    Object.setPrototypeOf(this, InviteNotFoundError.prototype);
  }
}

export class InviteExpiredError extends Error {
  readonly status = 400;
  constructor() {
    super("Este convite expirou.");
    this.name = "InviteExpiredError";
    Object.setPrototypeOf(this, InviteExpiredError.prototype);
  }
}

export class InviteEmailMismatchError extends Error {
  readonly status = 403;
  constructor() {
    super("Este convite foi enviado para outro email.");
    this.name = "InviteEmailMismatchError";
    Object.setPrototypeOf(this, InviteEmailMismatchError.prototype);
  }
}

export class LastOwnerError extends Error {
  readonly status = 422;
  constructor() {
    super("A organização precisa de pelo menos um OWNER.");
    this.name = "LastOwnerError";
    Object.setPrototypeOf(this, LastOwnerError.prototype);
  }
}

export class AdminCannotPromoteError extends Error {
  readonly status = 403;
  constructor() {
    super("ADMIN não pode promover membros para OWNER.");
    this.name = "AdminCannotPromoteError";
    Object.setPrototypeOf(this, AdminCannotPromoteError.prototype);
  }
}

export class MemberNotFoundError extends Error {
  readonly status = 404;
  constructor() {
    super("Membro não encontrado.");
    this.name = "MemberNotFoundError";
    Object.setPrototypeOf(this, MemberNotFoundError.prototype);
  }
}
