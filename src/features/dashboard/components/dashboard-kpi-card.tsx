import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardKpiCardProps {
  icon: LucideIcon;
  label: string;
  value?: number;
  isLoading?: boolean;
  /** Texto abaixo do número (ex: "vs última semana") */
  hint?: string;
  /** Cor de destaque da variante */
  variant?: "default" | "success" | "warning";
  "data-testid"?: string;
}

const VARIANT_CLASSES = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
} as const;

export function DashboardKpiCard({
  icon: Icon,
  label,
  value,
  isLoading,
  hint,
  variant = "default",
  "data-testid": testId,
}: DashboardKpiCardProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-md",
              VARIANT_CLASSES[variant]
            )}
          >
            <Icon className="size-4" aria-hidden />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-3 w-28" />
          </>
        ) : (
          <>
            <p className="text-3xl font-bold tabular-nums">
              {value?.toLocaleString("pt-BR") ?? "—"}
            </p>
            {hint && (
              <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
