import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { AuthPanel } from "./auth-panel";

interface AuthShellProps {
  children: ReactNode;
  variant: "login" | "signup";
}

export function AuthShell({ children, variant }: AuthShellProps) {
  return (
    <div className="min-h-screen grid md:grid-cols-[1fr_1fr] lg:grid-cols-[5fr_7fr]">
      {/* Left column — form area */}
      <div className="relative flex flex-col bg-background">
        {/* Brand — visible only on mobile (hidden on md+ where panel shows brand) */}
        <div className="flex items-center gap-2 p-6 md:p-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
            aria-label="Ir para página inicial"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
              <BarChart3 className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">SaaS Dashboard</span>
          </Link>
        </div>

        {/* Form centered vertically */}
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Right column — visual panel (hidden on mobile) */}
      <div className="hidden md:block relative overflow-hidden">
        <AuthPanel variant={variant} />
      </div>
    </div>
  );
}
