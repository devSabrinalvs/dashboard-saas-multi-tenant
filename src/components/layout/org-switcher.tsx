"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface OrgLink {
  id: string;
  name: string;
  slug: string;
}

interface OrgSwitcherProps {
  currentSlug: string;
  currentName: string;
  orgs: OrgLink[];
}

export function OrgSwitcher({
  currentSlug,
  currentName,
  orgs,
}: OrgSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Trocar de organização"
        >
          <span className="truncate">{currentName}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {orgs.map((org) => (
          <DropdownMenuItem key={org.id} asChild>
            <Link
              href={`/org/${org.slug}/dashboard`}
              className="flex cursor-pointer items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{org.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {org.slug}
                </p>
              </div>
              {org.slug === currentSlug && (
                <Check className="size-3.5 shrink-0 text-primary" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="/org/new"
            className="flex cursor-pointer items-center gap-2 text-muted-foreground"
          >
            <Plus className="size-3.5" />
            <span>Criar nova organização</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
