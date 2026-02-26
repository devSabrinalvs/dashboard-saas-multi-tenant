import { http, HttpResponse } from "msw";

export const handlers = [
  // GET /api/orgs — list user orgs
  http.get("/api/orgs", () => {
    return HttpResponse.json([
      {
        id: "membership-1",
        orgId: "org-1",
        role: "OWNER",
        org: {
          id: "org-1",
          name: "Test Org",
          slug: "test-org",
          createdAt: new Date().toISOString(),
        },
      },
    ]);
  }),

  // POST /api/orgs — create org
  http.post("/api/orgs", async ({ request }) => {
    const body = (await request.json()) as { name: string; slug: string };
    return HttpResponse.json(
      {
        id: "org-new",
        name: body.name,
        slug: body.slug,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // GET /api/orgs/:orgSlug/projects — list projects
  http.get("/api/orgs/:orgSlug/projects", () => {
    return HttpResponse.json([
      {
        id: "proj-1",
        name: "Project Alpha",
        description: "First project",
        status: "ACTIVE",
        orgId: "org-1",
        _count: { tasks: 3 },
        createdAt: new Date().toISOString(),
      },
      {
        id: "proj-2",
        name: "Project Beta",
        description: null,
        status: "ACTIVE",
        orgId: "org-1",
        _count: { tasks: 0 },
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  // POST /api/orgs/:orgSlug/projects — create project
  http.post("/api/orgs/:orgSlug/projects", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
    };
    return HttpResponse.json(
      {
        id: "proj-new",
        name: body.name,
        description: body.description ?? null,
        status: "ACTIVE",
        orgId: "org-1",
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // GET /api/orgs/:orgSlug/members — list members
  http.get("/api/orgs/:orgSlug/members", () => {
    return HttpResponse.json([
      {
        id: "mem-1",
        userId: "user-1",
        role: "OWNER",
        user: {
          id: "user-1",
          name: "Alice",
          email: "alice@test.com",
          image: null,
        },
      },
    ]);
  }),

  // POST /api/orgs/:orgSlug/invites — create invite
  http.post("/api/orgs/:orgSlug/invites", async ({ request }) => {
    const body = (await request.json()) as { email: string; role: string };
    return HttpResponse.json(
      {
        id: "invite-1",
        email: body.email,
        role: body.role,
        status: "PENDING",
        token: "test-token-123",
      },
      { status: 201 }
    );
  }),
];
