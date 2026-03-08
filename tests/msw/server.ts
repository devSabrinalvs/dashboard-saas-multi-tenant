/**
 * MSW server para interceptar fetch nos testes de UI (jsdom + Node).
 * Importar este módulo nos testes de UI para usar os helpers de setup.
 *
 * @example
 * import { server } from "@tests/msw/server";
 * import { projectHandlers } from "@tests/msw/handlers/projects";
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 */
import { setupServer } from "msw/node";
import { projectHandlers } from "./handlers/projects";
import { inviteHandlers } from "./handlers/invites";

/**
 * Servidor MSW com handlers padrão (projetos + invites).
 * Pode ser sobrescrito por teste via server.use(...handlers).
 */
export const server = setupServer(...projectHandlers, ...inviteHandlers);
