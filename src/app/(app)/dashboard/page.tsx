import { redirect } from "next/navigation";

/**
 * Rota legada /dashboard — redireciona para /org/select.
 * Necessário para compatibilidade com callbackUrl salvo em cookies
 * de sessões criadas antes da Etapa 3 (quando a rota ainda existia).
 */
export default function DashboardRedirectPage() {
  redirect("/org/select");
}
