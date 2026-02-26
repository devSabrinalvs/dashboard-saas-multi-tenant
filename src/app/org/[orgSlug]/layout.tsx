import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveOrgContext } from "@/shared/security";
import { prisma } from "@/shared/db";
import { Button } from "@/shared/ui/button";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  let context;
  try {
    context = await resolveOrgContext(orgSlug);
  } catch {
    redirect("/select-org");
  }

  const org = await prisma.organization.findUnique({
    where: { id: context.orgId },
    select: { name: true, slug: true },
  });

  if (!org) redirect("/select-org");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-14 items-center gap-4">
          <Link href={`/org/${org.slug}/dashboard`} className="font-semibold">
            {org.name}
          </Link>
          <nav className="flex gap-2">
            <Link href={`/org/${org.slug}/dashboard`}>
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href={`/org/${org.slug}/projects`}>
              <Button variant="ghost" size="sm">
                Projects
              </Button>
            </Link>
            <Link href={`/org/${org.slug}/members`}>
              <Button variant="ghost" size="sm">
                Members
              </Button>
            </Link>
          </nav>
          <div className="ml-auto">
            <Link href="/select-org">
              <Button variant="outline" size="sm">
                Switch Org
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
