import { http, HttpResponse } from "msw";

export const MOCK_INVITE_RESULT = {
  inviteId: "inv-test-1",
  inviteLink: "/invite/token-abc123",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

export const inviteHandlers = [
  /** POST /api/org/:orgSlug/invites — sucesso */
  http.post("*/api/org/:orgSlug/invites", () => {
    return HttpResponse.json(MOCK_INVITE_RESULT, { status: 201 });
  }),
];

export const inviteHandlersDuplicate = [
  http.post("*/api/org/:orgSlug/invites", () => {
    return HttpResponse.json(
      { error: "Convite duplicado para este email." },
      { status: 409 }
    );
  }),
];

export const inviteHandlersRateLimit = [
  http.post("*/api/org/:orgSlug/invites", () => {
    return HttpResponse.json(
      { error: "Muitas requisições. Tente novamente mais tarde." },
      { status: 429 }
    );
  }),
];
