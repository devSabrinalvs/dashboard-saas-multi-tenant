/**
 * Setup para testes de UI (RTL + MSW).
 * Executado pelo jest.config.ui.js via setupFiles.
 * Roda antes de cada arquivo de teste — não tem acesso a beforeAll/afterAll.
 */
import "@testing-library/jest-dom";

// Polyfill matchMedia (não existe em jsdom)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

// Polyfill ResizeObserver (usado por Radix UI)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  takeRecords() {
    return [];
  }
};

// Mock navigator.clipboard — configurable:true para que userEvent possa redefinir
Object.defineProperty(navigator, "clipboard", {
  writable: true,
  configurable: true,
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(""),
  },
});

// confirm() retorna true por padrão (para testes de deleção)
window.confirm = jest.fn(() => true);
