import {
  isValidConfirmText,
  getReauthMethodType,
  isRecentLogin,
  RECENT_LOGIN_WINDOW_MS,
} from "@/server/use-cases/delete-account";

// ---------------------------------------------------------------------------
// isValidConfirmText
// ---------------------------------------------------------------------------

describe("isValidConfirmText", () => {
  const email = "user@example.com";

  it("aceita o email exato do usuário", () => {
    expect(isValidConfirmText(email, email)).toBe(true);
  });

  it("aceita 'DELETE' em maiúsculas", () => {
    expect(isValidConfirmText("DELETE", email)).toBe(true);
  });

  it("rejeita 'delete' em minúsculas", () => {
    expect(isValidConfirmText("delete", email)).toBe(false);
  });

  it("rejeita texto parcial do email", () => {
    expect(isValidConfirmText("user@example", email)).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(isValidConfirmText("", email)).toBe(false);
  });

  it("rejeita email com espaços extras", () => {
    expect(isValidConfirmText(" user@example.com", email)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getReauthMethodType
// ---------------------------------------------------------------------------

describe("getReauthMethodType", () => {
  it("retorna 'password' para usuário com senha", () => {
    expect(
      getReauthMethodType({ password: "$2a$12$hash", twoFactorEnabled: false })
    ).toBe("password");
  });

  it("retorna 'password' mesmo que tenha 2FA (senha tem prioridade)", () => {
    expect(
      getReauthMethodType({ password: "$2a$12$hash", twoFactorEnabled: true })
    ).toBe("password");
  });

  it("retorna 'totp' para Google-only com 2FA ativo", () => {
    expect(
      getReauthMethodType({ password: null, twoFactorEnabled: true })
    ).toBe("totp");
  });

  it("retorna 'recentLogin' para Google-only sem 2FA", () => {
    expect(
      getReauthMethodType({ password: null, twoFactorEnabled: false })
    ).toBe("recentLogin");
  });
});

// ---------------------------------------------------------------------------
// isRecentLogin
// ---------------------------------------------------------------------------

describe("isRecentLogin", () => {
  it("retorna false para null (login desconhecido)", () => {
    expect(isRecentLogin(null)).toBe(false);
  });

  it("retorna true para login há 1 minuto", () => {
    const now = new Date();
    const loginAt = new Date(now.getTime() - 60_000);
    expect(isRecentLogin(loginAt, now)).toBe(true);
  });

  it("retorna true para login há exatamente 10 min", () => {
    const now = new Date();
    const loginAt = new Date(now.getTime() - RECENT_LOGIN_WINDOW_MS);
    expect(isRecentLogin(loginAt, now)).toBe(true);
  });

  it("retorna false para login há 11 minutos", () => {
    const now = new Date();
    const loginAt = new Date(now.getTime() - 11 * 60_000);
    expect(isRecentLogin(loginAt, now)).toBe(false);
  });

  it("retorna false para login há 1 hora", () => {
    const now = new Date();
    const loginAt = new Date(now.getTime() - 3_600_000);
    expect(isRecentLogin(loginAt, now)).toBe(false);
  });
});
