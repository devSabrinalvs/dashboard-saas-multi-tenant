"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { motion, LayoutGroup, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AuthPanel } from "./auth-panel";

interface AuthShellProps {
  children: ReactNode;
  mode: "login" | "signup";
}

export function AuthShell({ children, mode }: AuthShellProps) {
  const reduced = useReducedMotion();
  const spring = reduced
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 300, damping: 30 } as const);

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      <LayoutGroup id="auth-shell">
        {/* Form pane */}
        <motion.div
          layout
          transition={spring}
          className={cn(
            "relative flex flex-col bg-background",
            "w-full md:w-1/2",
            isLogin ? "md:order-1" : "md:order-2"
          )}
        >
          {/* Brand + Theme toggle */}
          <div className="flex items-center justify-between p-6 md:p-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
              aria-label="Ir para página inicial"
            >
              <div className="flex size-7 items-center justify-center rounded-md bg-foreground/[0.08]">
                <BarChart3 className="size-4 text-foreground" />
              </div>
              <span className="text-sm font-semibold">Projorg</span>
            </Link>
            <ThemeToggle />
          </div>

          {/* Form centered vertically */}
          <div className="flex flex-1 items-center justify-center px-6 pb-12">
            <div className="w-full max-w-sm">{children}</div>
          </div>
        </motion.div>

        {/* Art pane — hidden on mobile; bg-background creates the "margin" around the carousel card */}
        <motion.div
          layout
          transition={spring}
          className={cn(
            "hidden md:flex md:w-1/2 bg-background [padding:calc(var(--spacing)*8)]",
            isLogin ? "md:order-2" : "md:order-1"
          )}
        >
          <div className="flex-1 rounded-2xl overflow-hidden">
            <AuthPanel mode={mode} />
          </div>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
