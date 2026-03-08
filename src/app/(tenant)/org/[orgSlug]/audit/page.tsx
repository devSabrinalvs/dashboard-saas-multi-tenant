import { notFound } from "next/navigation";
import { requireOrgContext } from "@/server/org/require-org-context";
import { can } from "@/security/rbac";
import { AuditClient } from "@/features/audit/components/audit-client";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  if (!can(ctx.role, "audit:read")) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de ações realizadas na organização.
        </p>
      </div>
      <AuditClient orgSlug={orgSlug} />
    </div>
  );
}
