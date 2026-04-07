/**
 * Erros de domínio para operações de autenticação.
 * Cada classe expõe `.status` para mapeamento direto em route handlers.
 */

export class EmailAlreadyExistsError extends Error {
  readonly status = 409;

  constructor() {
    super("Este email já está cadastrado.");
    this.name = "EmailAlreadyExistsError";
    Object.setPrototypeOf(this, EmailAlreadyExistsError.prototype);
  }
}

export class EmailNotVerifiedError extends Error {
  readonly status = 403;

  constructor() {
    super("Verifique seu email antes de fazer login.");
    this.name = "EmailNotVerifiedError";
    Object.setPrototypeOf(this, EmailNotVerifiedError.prototype);
  }
}

export class AccountLockedError extends Error {
  readonly status = 423;
  /** Timestamp (ms epoch) até quando a conta fica bloqueada. */
  readonly lockedUntilMs: number;

  constructor(lockedUntil: Date) {
    super("Conta temporariamente bloqueada por muitas tentativas de login.");
    this.name = "AccountLockedError";
    this.lockedUntilMs = lockedUntil.getTime();
    Object.setPrototypeOf(this, AccountLockedError.prototype);
  }
}

export class InvalidTokenError extends Error {
  readonly status = 400;

  constructor() {
    super("Link de verificação inválido ou expirado.");
    this.name = "InvalidTokenError";
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class InvalidTotpError extends Error {
  readonly status = 400;

  constructor() {
    super("Código inválido. Verifique e tente novamente.");
    this.name = "InvalidTotpError";
    Object.setPrototypeOf(this, InvalidTotpError.prototype);
  }
}

export class TwoFactorNotEnabledError extends Error {
  readonly status = 400;

  constructor() {
    super("Autenticação de dois fatores não está ativa.");
    this.name = "TwoFactorNotEnabledError";
    Object.setPrototypeOf(this, TwoFactorNotEnabledError.prototype);
  }
}
