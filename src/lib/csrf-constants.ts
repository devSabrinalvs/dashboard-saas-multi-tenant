/**
 * Constantes CSRF compartilhadas entre Edge Runtime (middleware) e Node.js (route handlers).
 * Este arquivo NÃO pode importar módulos Node.js — deve ser Edge-safe.
 */
export const CSRF_COOKIE = "csrf_token";
export const CSRF_HEADER = "x-csrf-token";
