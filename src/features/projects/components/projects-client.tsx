"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Folder,
  LayoutTemplate,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProjectFormModal } from "./project-form-modal";
import { ProjectTemplatePicker } from "@/features/templates/components/project-template-picker";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useDeleteProject } from "@/features/projects/hooks/use-delete-project";
import type { Project } from "@/server/repo/project-repo";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  textPrimary: "#efefef",
  textSecondary: "#9a9a9a",
  textMuted: "#5a5a5a",
  cardBg: "rgba(255,255,255,0.022)",
  cardBorder: "rgba(255,255,255,0.07)",
  cardRadius: 10,
  font: "'Space Grotesk',sans-serif",
} as const;

// ─── Project icon (squircle with initials) ─────────────────────────────────

const ICON_BG = [
  "#22241f",
  "#1f2630",
  "#23202c",
  "#262220",
  "#1f2422",
  "#2c2222",
];

function getIconBg(name: string): string {
  const idx =
    [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % ICON_BG.length;
  return ICON_BG[idx]!;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function ProjectIcon({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: getIconBg(name),
        border: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: Math.round(size * 0.36),
        fontWeight: 600,
        color: "#bdbdbd",
        fontFamily: T.font,
        letterSpacing: "0.01em",
      }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Page header components ───────────────────────────────────────────────────

function AppPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        paddingBottom: 24,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        marginBottom: 28,
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
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: T.textSecondary,
              fontFamily: T.font,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── Search input ─────────────────────────────────────────────────────────────

function DarkSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 12px",
        background: "#161616",
        border: `1px solid ${focused ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 7,
        minWidth: 260,
        transition: "border-color 0.15s",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5a5a5a"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#efefef",
          fontSize: 13,
          flex: 1,
          fontFamily: T.font,
          caretColor: "#fff",
        }}
      />
    </div>
  );
}

// ─── Ghost button ─────────────────────────────────────────────────────────────

function GhostBtn({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 14px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 7,
        color: "#9a9a9a",
        fontSize: 12.5,
        fontWeight: 500,
        fontFamily: T.font,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function PrimaryBtn({
  children,
  icon,
  onClick,
  "data-testid": testId,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  "data-testid"?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "10px 16px",
        background: "#f0f0f0",
        border: "none",
        borderRadius: 7,
        color: "#080808",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: T.font,
        cursor: "pointer",
        transition: "background 0.15s",
        letterSpacing: "0.015em",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  deleting: boolean;
}

function ProjectCard({
  project,
  onClick,
  onEdit,
  onDelete,
  canUpdate,
  canDelete,
  deleting,
}: ProjectCardProps) {
  const [hovered, setHovered] = useState(false);

  const createdLabel = new Date(project.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.cardBg,
        border: `1px solid ${hovered ? "rgba(255,255,255,0.13)" : T.cardBorder}`,
        borderRadius: T.cardRadius,
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.16s ease",
        transform: hovered ? "translateY(-1px)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
      }}
      onClick={onClick}
    >
      {/* Header: icon + name + action buttons */}
      <div
        style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
      >
        <ProjectIcon name={project.name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: T.textPrimary,
              letterSpacing: "-0.015em",
              fontFamily: T.font,
              marginBottom: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {project.name}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 9px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 20,
              fontSize: 10.5,
              fontWeight: 500,
              color: "#9cc8a4",
              fontFamily: T.font,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#7aa380",
                display: "inline-block",
              }}
            />
            Ativo
          </div>
        </div>

        {/* Edit / Delete — stop click propagation */}
        {(canUpdate || canDelete) && (
          <div
            style={{
              display: "flex",
              gap: 4,
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.15s",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {canUpdate && onEdit && (
              <button
                onClick={onEdit}
                title="Editar projeto"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: "#7a7a7a",
                  padding: "5px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Pencil style={{ width: 12, height: 12 }} />
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={onDelete}
                title="Excluir projeto"
                disabled={deleting}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  cursor: deleting ? "not-allowed" : "pointer",
                  color: "#c89696",
                  padding: "5px",
                  display: "flex",
                  alignItems: "center",
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                <Trash2 style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {project.description ? (
        <p
          style={{
            fontSize: 12.5,
            color: "#7a7a7a",
            lineHeight: 1.55,
            fontFamily: T.font,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 40,
          }}
        >
          {project.description}
        </p>
      ) : (
        <p
          style={{
            fontSize: 12.5,
            color: "#3a3a3a",
            fontStyle: "italic",
            fontFamily: T.font,
            minHeight: 40,
            display: "flex",
            alignItems: "center",
          }}
        >
          Sem descrição
        </p>
      )}

      {/* Footer: date + open link */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          paddingTop: 4,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: T.textMuted,
            fontFamily: T.font,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Calendar style={{ width: 11, height: 11 }} />
          {createdLabel}
        </span>
        <span
          style={{
            fontSize: 11,
            color: T.textMuted,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: T.font,
          }}
        >
          Abrir <ArrowUpRight style={{ width: 10, height: 10 }} />
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: T.cardRadius,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Skeleton className="size-10 rounded-lg" />
        <div style={{ flex: 1 }}>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div>
        <Skeleton className="h-3.5 w-full mb-1.5" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
      <Skeleton className="h-3 w-24 mt-auto" />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectsClientProps {
  orgSlug: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectsClient({
  orgSlug,
  canCreate,
  canUpdate,
  canDelete,
}: ProjectsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20; // grid layout — 20 is a valid value (10/20/50)

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const { data, isLoading, error, refetch } = useProjects(orgSlug, {
    search: search || undefined,
    page,
    pageSize,
  });

  const deleteMutation = useDeleteProject(orgSlug);

  function handleEdit(project: Project) {
    setEditingProject(project);
    setModalOpen(true);
  }

  function handleNew() {
    setEditingProject(undefined);
    setModalOpen(true);
  }

  function handleDelete(project: Project) {
    if (
      !confirm(
        `Excluir projeto "${project.name}"? Esta ação não pode ser desfeita.`
      )
    )
      return;
    deleteMutation.mutate(project.id);
  }

  function handleModalClose(open: boolean) {
    setModalOpen(open);
    if (!open) setEditingProject(undefined);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const total = data?.total ?? 0;

  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <AppPageHeader
        title="Projetos"
        subtitle={
          data
            ? `${total} no total`
            : undefined
        }
        actions={
          <>
            <DarkSearchInput
              value={search}
              onChange={handleSearch}
              placeholder="Buscar projetos…"
            />
            {canCreate && (
              <>
                <GhostBtn
                  icon={<LayoutTemplate style={{ width: 13, height: 13 }} />}
                  onClick={() => setTemplatePickerOpen(true)}
                >
                  De template
                </GhostBtn>
                <PrimaryBtn
                  icon={<Plus style={{ width: 13, height: 13, strokeWidth: 2 }} />}
                  onClick={handleNew}
                  data-testid="new-project-btn"
                >
                  Novo Projeto
                </PrimaryBtn>
              </>
            )}
          </>
        }
      />

      {/* ── Loading skeleton grid ─────────────────────────────────────────── */}
      {isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <ErrorState
          description={`Erro ao carregar projetos: ${error.message}`}
          onRetry={() => void refetch()}
        />
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!isLoading && !error && data?.items.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 14,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7a7a7a",
            }}
          >
            <Folder style={{ width: 32, height: 32, strokeWidth: 1.3 }} />
          </div>
          <div style={{ textAlign: "center", maxWidth: 380 }}>
            <h2
              style={{
                fontSize: 19,
                fontWeight: 600,
                color: T.textPrimary,
                letterSpacing: "-0.02em",
                marginBottom: 8,
                fontFamily: T.font,
              }}
            >
              {search ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "#7a7a7a",
                lineHeight: 1.6,
                fontFamily: T.font,
              }}
            >
              {search
                ? `Nenhum projeto corresponde a "${search}"`
                : "Projetos agrupam tarefas, membros e prazos. Crie um para começar a acompanhar o trabalho do time."}
            </p>
          </div>
          {!search && canCreate && (
            <PrimaryBtn
              icon={<Plus style={{ width: 13, height: 13, strokeWidth: 2 }} />}
              onClick={handleNew}
              data-testid="empty-state-cta"
            >
              Criar primeiro projeto
            </PrimaryBtn>
          )}

        </div>
      )}

      {/* ── Card grid ────────────────────────────────────────────────────── */}
      {!isLoading && !error && (data?.items.length ?? 0) > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
          data-testid="projects-table"
        >
          {data?.items.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() =>
                router.push(`/org/${orgSlug}/projects/${project.id}`)
              }
              onEdit={() => handleEdit(project)}
              onDelete={() => handleDelete(project)}
              canUpdate={canUpdate}
              canDelete={canDelete}
              deleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {data && data.totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <span
            style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font }}
          >
            {total} projeto{total !== 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span
              style={{
                fontSize: 12,
                color: T.textSecondary,
                fontFamily: T.font,
              }}
            >
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <ProjectFormModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        orgSlug={orgSlug}
        project={editingProject}
      />
      <ProjectTemplatePicker
        orgSlug={orgSlug}
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
      />
    </>
  );
}
