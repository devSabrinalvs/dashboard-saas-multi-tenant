"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthShell } from "@/features/auth/components/auth-shell";

const AUTH_PATHS = ["/login", "/signup"];

export default function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.includes(pathname);

  // Non-auth pages (forgot-password, invite, etc.) render children normally
  if (!isAuth) return <>{children}</>;

  // Auth pages: AuthShell owns the full layout; page components return null
  const initialMode: "login" | "signup" = pathname === "/signup" ? "signup" : "login";
  return <AuthShell initialMode={initialMode} />;
}
