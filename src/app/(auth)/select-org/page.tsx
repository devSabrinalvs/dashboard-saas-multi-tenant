import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/shared/auth";
import { orgRepo } from "@/features/orgs/repo";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/ui/card";
import { CreateOrgDialog } from "@/features/orgs/components/create-org-dialog";

export default async function SelectOrgPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await orgRepo.findByUserId(session.user.id);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
          <CardDescription>
            Choose an organization to continue, or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You are not a member of any organization yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {memberships.map((membership) => (
                <li key={membership.id}>
                  <Link href={`/org/${membership.org.slug}/dashboard`}>
                    <Button variant="outline" className="w-full justify-start">
                      <span className="font-medium">
                        {membership.org.name}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {membership.role}
                      </span>
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <CreateOrgDialog />
        </CardContent>
      </Card>
    </div>
  );
}
