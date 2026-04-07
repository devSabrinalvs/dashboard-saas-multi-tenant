/**
 * Utilitário de redação para logs do servidor.
 *
 * Garante que tokens, senhas, secrets e outros dados sensíveis nunca
 * apareçam em logs de produção.
 *
 * Uso:
 *   console.log("[token]", redact(rawToken));          // → "[REDACTED]"
 *   console.log("[email]", redactEmail("u@ex.com"));   // → "u***@ex.com"
 *   console.log("[ip]", redactIp("192.168.1.100"));    // → "192.168.x.x"
 */

/** Valor exibido no lugar de dados sensíveis em logs. */
const REDACTED = "[REDACTED]";

/**
 * Oculta completamente um valor sensível (tokens, passwords, secrets, etc.).
 * Use para qualquer valor que nunca deve aparecer em logs.
 */
export function redact(_value: string): string {
  return REDACTED;
}

/**
 * Redaciona um endereço de email preservando o domínio e o primeiro caractere.
 * Ex: "user@example.com" → "u***@example.com"
 */
export function redactEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return REDACTED;
  const first = email[0] ?? "";
  const domain = email.slice(at);
  return `${first}***${domain}`;
}

/**
 * Redaciona os últimos dois octetos de um IPv4 ou trunca um IPv6.
 * Ex: "192.168.1.100" → "192.168.x.x"
 * Ex: "2001:db8::1"   → "2001:db8::x"
 */
export function redactIp(ip: string): string {
  if (!ip || ip === "unknown") return ip;
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  // IPv6 — mantém apenas o prefixo
  const colonIdx = ip.lastIndexOf(":");
  if (colonIdx > 0) return ip.slice(0, colonIdx) + ":x";
  return REDACTED;
}

/**
 * Registra uma mensagem de log de segurança com campos sensíveis já redatados.
 * Evita acidentalmente incluir dados brutos.
 *
 * @param level  - "info" | "warn" | "error"
 * @param msg    - Mensagem principal
 * @param fields - Campos a logar (valores já devem estar redatados se necessário)
 */
export function secureLog(
  level: "info" | "warn" | "error",
  msg: string,
  fields?: Record<string, string | number | boolean | null | undefined>
): void {
  const prefix = `[security:${level.toUpperCase()}]`;
  if (fields) {
    // eslint-disable-next-line no-console
    console[level](`${prefix} ${msg}`, fields);
  } else {
    // eslint-disable-next-line no-console
    console[level](`${prefix} ${msg}`);
  }
}
