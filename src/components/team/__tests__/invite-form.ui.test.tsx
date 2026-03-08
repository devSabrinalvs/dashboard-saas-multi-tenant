/**
 * UI tests para InviteForm (RTL).
 * Usa mock de global.fetch em vez de MSW para evitar
 * problemas de compatibilidade ESM/CJS em jest.
 *
 * Como rodar: pnpm test:ui
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteForm } from "../invite-form";

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/org/test-org/team"),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderForm() {
  return render(<InviteForm orgSlug="test-org" />);
}

const TEST_EMAIL = "colaborador@empresa.com";
const MOCK_INVITE_LINK = "/invite/abc123token";

function mockFetchOk() {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 201,
    json: async () => ({
      inviteId: "inv-1",
      inviteLink: MOCK_INVITE_LINK,
      expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
    }),
  });
}

function mockFetchError(status: number, error: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error }),
  });
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("InviteForm", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    // clearAllMocks preserva a implementação dos mocks de módulo (useRouter etc.)
    // resetAllMocks removeria a implementação e quebraria testes subsequentes
    jest.clearAllMocks();
  });

  it("renderiza input de email e botão Convidar", () => {
    renderForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByTestId("invite-submit-btn")).toBeInTheDocument();
    expect(screen.getByTestId("invite-submit-btn")).toHaveTextContent("Convidar");
  });

  it("mostra link do convite após submit bem-sucedido", async () => {
    mockFetchOk();
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email/i), TEST_EMAIL);
    await user.click(screen.getByTestId("invite-submit-btn"));

    await waitFor(() => {
      expect(screen.getByText(new RegExp(MOCK_INVITE_LINK))).toBeInTheDocument();
    });
  });

  it("mostra erro de email duplicado (409)", async () => {
    mockFetchError(409, "Convite duplicado para este email.");
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email/i), TEST_EMAIL);
    await user.click(screen.getByTestId("invite-submit-btn"));

    await waitFor(() => {
      expect(screen.getByText(/Convite duplicado/i)).toBeInTheDocument();
    });
  });

  it("mostra erro genérico em caso de rate limit (429)", async () => {
    mockFetchError(429, "Muitas requisições. Tente novamente mais tarde.");
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email/i), TEST_EMAIL);
    await user.click(screen.getByTestId("invite-submit-btn"));

    await waitFor(() => {
      expect(screen.getByText(/Muitas requisições/i)).toBeInTheDocument();
    });
  });

  it("não submete com email inválido (validação Zod)", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email/i), "nao-e-um-email");
    await user.click(screen.getByTestId("invite-submit-btn"));

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
      expect(screen.queryByText(new RegExp(MOCK_INVITE_LINK))).not.toBeInTheDocument();
    });
  });

  it("botão exibe 'Enviando…' durante o submit e volta para 'Convidar' após", async () => {
    let resolveResponse!: (value: unknown) => void;
    (global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveResponse = resolve;
      })
    );

    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email/i), TEST_EMAIL);
    await user.click(screen.getByTestId("invite-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("invite-submit-btn")).toHaveTextContent("Enviando…");
    });

    resolveResponse({
      ok: true,
      status: 201,
      json: async () => ({ inviteId: "inv-1", inviteLink: MOCK_INVITE_LINK, expiresAt: "" }),
    });

    await waitFor(() => {
      expect(screen.getByTestId("invite-submit-btn")).toHaveTextContent("Convidar");
    });
  });
});
