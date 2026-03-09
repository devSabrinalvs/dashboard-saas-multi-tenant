import { cn } from "@/lib/utils";

type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Membro",
  VIEWER: "Visualizador",
};

const ROLE_CLASSES: Record<Role, string> = {
  OWNER:
    "border-transparent bg-primary text-primary-foreground",
  ADMIN:
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  MEMBER:
    "border bg-transparent text-foreground",
  VIEWER:
    "border bg-transparent text-muted-foreground",
};

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        ROLE_CLASSES[role],
        className
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
