import { PrismaClient, MemberRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const alice = await prisma.user.upsert({
    where: { email: "alice@test.com" },
    update: {},
    create: { email: "alice@test.com", name: "Alice" },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@test.com" },
    update: {},
    create: { email: "bob@test.com", name: "Bob" },
  });

  // Create organization
  const org = await prisma.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: { name: "Acme Corp", slug: "acme-corp" },
  });

  // Create memberships
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: alice.id, orgId: org.id } },
    update: {},
    create: {
      userId: alice.id,
      orgId: org.id,
      role: MemberRole.OWNER,
    },
  });

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: bob.id, orgId: org.id } },
    update: {},
    create: {
      userId: bob.id,
      orgId: org.id,
      role: MemberRole.MEMBER,
    },
  });

  // Create a project
  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "Website Redesign",
      description: "Redesign the company website",
      orgId: org.id,
    },
  });

  // Create tasks
  await prisma.task.upsert({
    where: { id: "seed-task-1" },
    update: {},
    create: {
      id: "seed-task-1",
      title: "Design mockups",
      orgId: org.id,
      projectId: project.id,
      status: "DONE",
    },
  });

  await prisma.task.upsert({
    where: { id: "seed-task-2" },
    update: {},
    create: {
      id: "seed-task-2",
      title: "Implement homepage",
      orgId: org.id,
      projectId: project.id,
      status: "IN_PROGRESS",
    },
  });

  await prisma.task.upsert({
    where: { id: "seed-task-3" },
    update: {},
    create: {
      id: "seed-task-3",
      title: "Write tests",
      orgId: org.id,
      projectId: project.id,
      status: "TODO",
    },
  });

  console.log("Seed complete:", { alice, bob, org, project });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
