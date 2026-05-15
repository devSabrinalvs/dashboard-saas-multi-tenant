import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireOrgContext } from "@/server/org/require-org-context";
import { can } from "@/security/rbac";
import { getProject } from "@/server/use-cases/get-project";
import { ProjectNotFoundError } from "@/server/errors/project-errors";
import { TasksSection } from "@/features/tasks/components/tasks-section";

const T = {
  textPrimary: "#efefef",
  textSecondary: "#9a9a9a",
  textMuted: "#5a5a5a",
  font: "'Space Grotesk',sans-serif",
} as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
}) {
  const { orgSlug, projectId } = await params;
  const ctx = await requireOrgContext(orgSlug);

  let project;
  try {
    project = await getProject(ctx, projectId);
  } catch (err) {
    if (err instanceof ProjectNotFoundError) notFound();
    throw err;
  }

  const canCreateTask = can(ctx.role, "task:create");
  const canUpdateTask = can(ctx.role, "task:update");
  const canDeleteTask = can(ctx.role, "task:delete");

  const createdLabel = new Date(project.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        style={{
          paddingBottom: 24,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          marginBottom: 28,
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: T.textMuted,
            fontFamily: T.font,
            marginBottom: 12,
          }}
        >
          <Link
            href={`/org/${orgSlug}/projects`}
            style={{
              color: T.textMuted,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              transition: "color 0.15s",
            }}
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
            Projetos
          </Link>
          <span style={{ color: "#2a2a2a" }}>/</span>
          <span style={{ color: "#9a9a9a" }}>{project.name}</span>
        </div>

        {/* Title + meta */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: T.textPrimary,
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
                fontFamily: T.font,
              }}
            >
              {project.name}
            </h1>
            {project.description && (
              <p
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: T.textSecondary,
                  fontFamily: T.font,
                  lineHeight: 1.5,
                }}
              >
                {project.description}
              </p>
            )}
            <p
              style={{
                marginTop: 6,
                fontSize: 12,
                color: T.textMuted,
                fontFamily: T.font,
              }}
            >
              Criado em {createdLabel}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tasks ────────────────────────────────────────────────────────── */}
      <TasksSection
        orgSlug={orgSlug}
        projectId={projectId}
        canCreate={canCreateTask}
        canUpdate={canUpdateTask}
        canDelete={canDeleteTask}
        currentUserId={ctx.userId}
      />
    </div>
  );
}
