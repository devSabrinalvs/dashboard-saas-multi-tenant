"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projetos",
  team: "Equipe",
  audit: "Auditoria",
  settings: "Configurações",
};

const PAGE_SEGMENTS = Object.keys(PAGE_LABELS);

interface TopbarProps {
  userEmail: string;
  orgName: string;
}

function getInitials(email: string): string {
  if (!email) return "U";
  const local = email.split("@")[0] ?? "U";
  return local.slice(0, 2).toUpperCase();
}

export function Topbar({ userEmail, orgName }: TopbarProps) {
  const pathname = usePathname();
  const segment =
    pathname.split("/").find((s) => PAGE_SEGMENTS.includes(s)) ?? "";
  const pageLabel = PAGE_LABELS[segment] ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 gap-4">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="truncate max-w-[140px] text-muted-foreground">
          {orgName}
        </span>
        {pageLabel && (
          <>
            <span className="text-muted-foreground/40 select-none">/</span>
            <span className="font-medium text-foreground">{pageLabel}</span>
          </>
        )}
      </div>

      {/* Right — theme toggle + profile */}
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Menu do usuário"
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(userEmail)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5">
              <p className="truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
