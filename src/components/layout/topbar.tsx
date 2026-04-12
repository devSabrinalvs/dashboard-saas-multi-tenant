"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { GlobalSearchDialog } from "@/features/search/components/global-search-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  userName?: string | null;
  orgName: string;
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (!email) return "U";
  const local = email.split("@")[0] ?? "U";
  return local.slice(0, 2).toUpperCase();
}

export function Topbar({ userEmail, userName, orgName }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const segment =
    pathname.split("/").find((s) => PAGE_SEGMENTS.includes(s)) ?? "";
  const pageLabel = PAGE_LABELS[segment] ?? "";

  // Extrai /org/[orgSlug] da URL atual para montar link de configurações
  const orgSlug = pathname.match(/\/org\/([^/]+)/)?.[1] ?? "";

  // Cmd+K / Ctrl+K to open search
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {orgSlug && (
        <GlobalSearchDialog
          orgSlug={orgSlug}
          open={searchOpen}
          onOpenChange={setSearchOpen}
        />
      )}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 gap-4">
      {/* Left — breadcrumb + search */}
      <div className="flex items-center gap-3 min-w-0">
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
        {orgSlug && (
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-2 text-muted-foreground h-8 px-3 text-xs"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-3.5" />
            <span>Buscar...</span>
            <kbd className="pointer-events-none ml-1 hidden select-none rounded border bg-muted px-1 py-0.5 font-mono text-[10px] sm:inline-block">
              ⌘K
            </kbd>
          </Button>
        )}
      </div>

      {/* Right — theme toggle + notifications + profile */}
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Menu do usuário"
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(userName, userEmail)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5">
              {userName && (
                <p className="truncate text-sm font-medium">{userName}</p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer flex items-center gap-2"
              onClick={() => router.push(`/org/${orgSlug}/settings`)}
            >
              <Settings className="size-3.5" aria-hidden />
              Configurações
            </DropdownMenuItem>
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
    </>
  );
}
