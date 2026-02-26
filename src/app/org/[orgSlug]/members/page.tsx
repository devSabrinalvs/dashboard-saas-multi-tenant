import { resolveOrgContext, can } from "@/shared/security";
import { memberRepo } from "@/features/members/repo";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { InviteMemberForm } from "@/features/members/components/invite-member-form";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const context = await resolveOrgContext(orgSlug);
  const members = await memberRepo.listByOrg(context.orgId);
  const canInvite = can(context.role, "member:invite");

  const pendingInvites = canInvite
    ? await memberRepo.listInvitesByOrg(context.orgId)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Members</h1>

      {canInvite && <InviteMemberForm orgSlug={orgSlug} />}

      <Card>
        <CardHeader>
          <CardTitle>Current Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {members.map((membership) => (
              <li
                key={membership.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">
                    {membership.user.name ?? membership.user.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {membership.user.email}
                  </p>
                </div>
                <Badge
                  variant={
                    membership.role === "OWNER" ? "default" : "secondary"
                  }
                >
                  {membership.role}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {canInvite && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites ({pendingInvites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="text-sm">{invite.email}</span>
                  <Badge variant="outline">{invite.role}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
