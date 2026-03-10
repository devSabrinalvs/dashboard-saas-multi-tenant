import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AuthShell variant="login">
      {/* Suspense required because LoginForm uses useSearchParams */}
      <Suspense fallback={<div className="h-64 w-full" aria-hidden />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
