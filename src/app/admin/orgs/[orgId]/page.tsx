import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { findAdminOrgById } from "@/server/repo/admin-org-repo";
import { Badge } from "@/components/ui/badge";
import { AdminOrgActions } from "@/features/admin/components/admin-org-actions";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  PRO: "Pro",
  BUSINESS: "Business",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export default async function AdminOrgDetailPage({ params }: PageProps) {
  await requireSuperAdmin();
  const { orgId } = await params;

  const org = await findAdminOrgById(orgId);
  if (!org) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold">
          Org: <span className="font-mono">{org.slug}</span>
        </h2>
        <p className="text-sm text-muted-foreground font-mono">{org.id}</p>
      </div>

      {/* Info */}
      <div className="rounded-md border divide-y">
        <Row label="Nome" value={org.name} />
        <Row label="Slug" value={org.slug} />
        <Row label="Plano" value={PLAN_LABELS[org.plan] ?? org.plan} />
        <Row
          label="Status Stripe"
          value={org.subscriptionStatus ?? "—"}
        />
        <Row label="Membros" value={String(org.memberCount)} />
        <Row label="Projetos" value={String(org.projectCount)} />
        <Row label="Tasks" value={String(org.taskCount)} />
        <Row
          label="Billing email"
          value={org.billingEmail ?? "—"}
        />
        <Row
          label="Stripe Customer ID"
          value={org.stripeCustomerId ?? "—"}
        />
        <Row
          label="Grace period até"
          value={
            org.graceUntil
              ? new Date(org.graceUntil).toLocaleString("pt-BR")
              : "—"
          }
        />
        <Row
          label="Período atual até"
          value={
            org.currentPeriodEnd
              ? new Date(org.currentPeriodEnd).toLocaleString("pt-BR")
              : "—"
          }
        />
        <Row
          label="Cancel ao fim do período"
          value={org.cancelAtPeriodEnd ? "Sim" : "Não"}
        />
        <Row
          label="Criado em"
          value={new Date(org.createdAt).toLocaleString("pt-BR")}
        />
      </div>

      {/* Membros */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Membros</h3>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Entrou em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {org.members.map((m) => (
                <tr key={m.userId} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs">{m.email}</td>
                  <td className="px-4 py-2">
                    <Badge
                      variant={m.role === "OWNER" ? "secondary" : "outline"}
                    >
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(m.joinedAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ações */}
      <AdminOrgActions orgId={org.id} orgSlug={org.slug} currentPlan={org.plan} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="w-44 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
