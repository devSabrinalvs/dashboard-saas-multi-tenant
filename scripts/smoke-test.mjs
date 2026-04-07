#!/usr/bin/env node
/**
 * Smoke test pós-deploy — valida endpoints críticos.
 *
 * Uso:
 *   node scripts/smoke-test.mjs https://seu-app.vercel.app
 *
 * Requer: Node.js 18+ (fetch nativo)
 *
 * Saída:
 *   ✓ /api/health — ok
 *   ✗ /api/health — FAIL (db: error) [503]
 *   ...
 *   SMOKE TEST: 5/6 passed — FAIL
 */

const BASE = process.argv[2];

if (!BASE) {
  console.error("Uso: node scripts/smoke-test.mjs <BASE_URL>");
  console.error("Ex:  node scripts/smoke-test.mjs https://seu-app.vercel.app");
  process.exit(1);
}

const BASE_URL = BASE.replace(/\/$/, "");

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✓ ${label}`);
}

function fail(label, reason) {
  failed++;
  console.error(`  ✗ ${label} — ${reason}`);
}

async function get(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      ...opts,
    });
    return res;
  } catch (err) {
    return { ok: false, status: 0, _error: err.message };
  }
}

// ─── Testes ───────────────────────────────────────────────────────────────────

console.log(`\nSmoke test → ${BASE_URL}\n`);

// 1. Health check
{
  const res = await get("/api/health");
  if (!res.status) {
    fail("/api/health", `Connection error: ${res._error}`);
  } else if (res.status !== 200) {
    fail("/api/health", `Status ${res.status}`);
  } else {
    const body = await res.json().catch(() => null);
    if (!body?.ok || body?.db !== "ok") {
      fail("/api/health", `Body inválido: ${JSON.stringify(body)}`);
    } else {
      ok(`/api/health — version: ${body.version}, ts: ${body.ts}`);
    }
  }
}

// 2. Página de login acessível
{
  const res = await get("/login");
  if (!res.status) {
    fail("/login", `Connection error: ${res._error}`);
  } else if (res.status !== 200) {
    fail("/login", `Status esperado 200, recebido ${res.status}`);
  } else {
    ok("/login — retornou 200");
  }
}

// 3. Rota protegida redireciona para /login
{
  const res = await get("/org/test-slug/dashboard");
  if (!res.status) {
    fail("/org/:slug/dashboard (redirect)", `Connection error: ${res._error}`);
  } else if (res.status === 302 || res.status === 307 || res.status === 308) {
    const location = res.headers?.get?.("location") ?? "";
    if (location.includes("/login")) {
      ok(`/org/:slug/dashboard → redirect para ${location}`);
    } else {
      fail("/org/:slug/dashboard (redirect)", `Redirect para ${location} (esperado /login)`);
    }
  } else if (res.status === 200) {
    // Se renderizou sem autenticação — problema de segurança
    fail("/org/:slug/dashboard (redirect)", "Retornou 200 sem auth (deveria redirecionar)");
  } else {
    ok(`/org/:slug/dashboard — respondeu ${res.status} (esperado redirect)`);
  }
}

// 4. NextAuth session endpoint responde
{
  const res = await get("/api/auth/session");
  if (!res.status) {
    fail("/api/auth/session", `Connection error: ${res._error}`);
  } else if (res.status !== 200) {
    fail("/api/auth/session", `Status ${res.status}`);
  } else {
    ok("/api/auth/session — NextAuth online");
  }
}

// 5. CSP header presente
{
  const res = await get("/");
  if (!res.status) {
    fail("CSP header", `Connection error: ${res._error}`);
  } else {
    const csp = res.headers?.get?.("content-security-policy") ?? "";
    if (csp.includes("default-src") && csp.includes("frame-ancestors")) {
      ok(`CSP header presente (${csp.slice(0, 60)}...)`);
    } else {
      fail("CSP header", "Header ausente ou incompleto");
    }
  }
}

// 6. HSTS header presente (apenas em HTTPS)
{
  if (BASE_URL.startsWith("https://")) {
    const res = await get("/");
    if (!res.status) {
      fail("HSTS header", `Connection error: ${res._error}`);
    } else {
      const hsts = res.headers?.get?.("strict-transport-security") ?? "";
      if (hsts.includes("max-age")) {
        ok(`HSTS presente: ${hsts}`);
      } else {
        fail("HSTS header", "Ausente — necessário em produção HTTPS");
      }
    }
  } else {
    ok("HSTS — pulado (HTTP/dev)");
  }
}

// ─── Resultado ────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
const total = passed + failed;
const status = failed === 0 ? "PASS ✓" : "FAIL ✗";
console.log(`SMOKE TEST: ${passed}/${total} passed — ${status}`);
console.log(`${"─".repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}
