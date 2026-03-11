import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    // Suspense required because LoginForm uses useSearchParams
    <Suspense fallback={<div className="h-64 w-full" aria-hidden />}>
      <LoginForm />
    </Suspense>
  );
}
