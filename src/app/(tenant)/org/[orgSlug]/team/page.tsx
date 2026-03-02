import { requireOrgContext } from "@/server/org/require-org-context";
import { listMemberships } from "@/server/repo/membership-repo";
import { listInvites } from "@/server/repo/invite-repo";
import { can } from "@/security/rbac";
import { InviteForm } from "@/components/team/invite-form";
import { MemberRowActions } from "@/components/team/member-row-actions";
import { InviteRowActions } from "@/components/team/invite-row-actions";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/generated/prisma/enums";

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Membro",
  VIEWER: "Visualizador",
};

const ROLE_VARIANT: Record<
  Role,
  "default" | "secondary" | "outline" | "destructive"
> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const [members, invites] = await Promise.all([
    listMemberships(ctx.orgId),
    listInvites(ctx.orgId),
  ]);

  const canInvite = can(ctx.role, "member:invite");
  const canRemove = can(ctx.role, "member:remove");
  const canUpdateRole = can(ctx.role, "member:role:update");

  const pendingInvites = invites.filter((i) => i.status === "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Equipe</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Membros de <span className="font-medium">{ctx.orgName}</span>
        </p>
      </div>

      {/* Members table */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Membros ({members.length})
        </h2>
        <div className="rounded-md border divide-y">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3 gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.user.name ?? m.user.email}
                </p>
                {m.user.name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {m.user.email}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={ROLE_VARIANT[m.role]}>
                  {ROLE_LABELS[m.role]}
                </Badge>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  desde {formatDate(m.createdAt)}
                </span>
                {(canUpdateRole || canRemove) && (
                  <MemberRowActions
                    orgSlug={orgSlug}
                    memberId={m.id}
                    currentRole={m.role}
                    isSelf={m.userId === ctx.userId}
                    actorRole={ctx.role}
                    canUpdateRole={canUpdateRole}
                    canRemove={canRemove}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending invites + invite form */}
      {canInvite && (
        <>
          <Separator />
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Convites pendentes ({pendingInvites.length})
            </h2>

            {pendingInvites.length > 0 && (
              <div className="rounded-md border divide-y">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between px-4 py-3 gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expira em {formatDate(invite.expiresAt)}
                      </p>
                    </div>
                    <InviteRowActions orgSlug={orgSlug} inviteId={invite.id} />
                  </div>
                ))}
              </div>
            )}

            {pendingInvites.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum convite pendente.
              </p>
            )}

            <InviteForm orgSlug={orgSlug} />
          </section>
        </>
      )}
    </div>
  );
}
