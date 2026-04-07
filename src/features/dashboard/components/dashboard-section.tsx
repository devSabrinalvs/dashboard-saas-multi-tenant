import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function DashboardSection({
  title,
  viewAllHref,
  viewAllLabel = "Ver tudo",
  children,
  className,
  "data-testid": testId,
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-3", className)} data-testid={testId}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {viewAllLabel}
            <ChevronRight className="size-3" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
