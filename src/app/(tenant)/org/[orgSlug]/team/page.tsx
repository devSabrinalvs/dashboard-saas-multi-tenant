import { requireOrgContext } from "@/server/org/require-org-context";
import { listMemberships } from "@/server/repo/membership-repo";
import { listInvites } from "@/server/repo/invite-repo";
import { can } from "@/security/rbac";
import { InviteForm } from "@/components/team/invite-form";
import { MemberRowActions } from "@/components/team/member-row-actions";
import { InviteRowActions } from "@/components/team/invite-row-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { RoleBadge } from "@/components/shared/role-badge";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";

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
    <div className="space-y-6">
      <PageHeader title="Equipe" subtitle={`Membros de ${ctx.orgName}`} />

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Membros ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 1 && (
            <div className="px-6 pb-6">
              <EmptyState
                icon={UserPlus}
                title="Você é o único membro"
                subtitle="Convide colegas para colaborar em projetos e tarefas."
                action={
                  canInvite ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href="#invite-form">Convidar alguém</a>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          )}
          <div className="divide-y">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-6 py-3 gap-4"
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
                  <RoleBadge role={m.role as Role} />
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
        </CardContent>
      </Card>

      {/* Pending invites + invite form */}
      {canInvite && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Convites pendentes ({pendingInvites.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingInvites.length > 0 ? (
                <div className="divide-y">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between px-6 py-3 gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Expira em {formatDate(invite.expiresAt)}
                        </p>
                      </div>
                      <InviteRowActions
                        orgSlug={orgSlug}
                        inviteId={invite.id}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-6 pb-4 text-sm text-muted-foreground">
                  Nenhum convite pendente.
                </p>
              )}
            </CardContent>
          </Card>

          <Card id="invite-form">
            <CardContent className="pt-6">
              <InviteForm orgSlug={orgSlug} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
