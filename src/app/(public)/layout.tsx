"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AuthShell } from "@/features/auth/components/auth-shell";

const AUTH_PATHS = ["/login", "/signup"];

export default function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const isAuth = AUTH_PATHS.includes(pathname);
  const mode: "login" | "signup" = pathname === "/signup" ? "signup" : "login";

  // Non-auth pages (forgot-password, invite, etc.) render without AuthShell
  if (!isAuth) return <>{children}</>;

  return (
    <AuthShell mode={mode}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? {} : { opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
