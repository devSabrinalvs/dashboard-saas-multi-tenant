/**
 * DEV ONLY — preview da tela /2fa/verify sem precisar de sessão real.
 * Remover antes de ir para produção.
 */

import { redirect } from "next/navigation";
import { TwoFactorVerifyForm } from "@/features/auth/components/two-factor-verify-form";

export default function Preview2FAPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  return <TwoFactorVerifyForm />;
}
