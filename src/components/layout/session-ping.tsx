"use client";

import { useEffect } from "react";

/**
 * Componente invisível que faz ping na sessão ao montar.
 * Atualiza lastSeenAt no servidor (com throttle de 10 min server-side).
 * Renderizado no layout do tenant para cobrir todas as páginas autenticadas.
 */
export function SessionPing() {
  useEffect(() => {
    fetch("/api/auth/sessions/ping", { method: "POST" }).catch(() => undefined);
  }, []);

  return null;
}
