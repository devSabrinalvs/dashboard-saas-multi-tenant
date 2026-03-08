"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProjectFormModal } from "./project-form-modal";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useDeleteProject } from "@/features/projects/hooks/use-delete-project";
import type { Project } from "@/server/repo/project-repo";

interface ProjectsClientProps {
  orgSlug: string;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function ProjectsClient({
  orgSlug,
  canCreate,
  canUpdate,
  canDelete,
}: ProjectsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  const { data, isLoading, error } = useProjects(orgSlug, {
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
    if (!confirm(`Excluir projeto "${project.name}"? Esta ação não pode ser desfeita.`)) return;
    deleteMutation.mutate(project.id);
  }

  function handleModalClose(open: boolean) {
    setModalOpen(open);
    if (!open) setEditingProject(undefined);
  }

  // Reset page when search changes
  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Buscar projetos…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        {canCreate && (
          <Button size="sm" onClick={handleNew} data-testid="new-project-btn">
            <Plus className="size-4" />
            Novo Projeto
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">
          Erro ao carregar projetos: {error.message}
        </p>
      )}

      {/* Empty */}
      {!isLoading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <Folder className="size-10 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium">Nenhum projeto encontrado</p>
            {search ? (
              <p className="text-xs text-muted-foreground">
                Nenhum projeto corresponde a &quot;{search}&quot;
              </p>
            ) : canCreate ? (
              <p className="text-xs text-muted-foreground">
                Crie o primeiro projeto clicando em &quot;Novo Projeto&quot;
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (data?.items.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm" data-testid="projects-table">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Projeto</th>
                <th className="hidden px-4 py-3 text-left font-medium md:table-cell">
                  Criado em
                </th>
                <th className="w-24 px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.items.map((project) => (
                <tr
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    router.push(
                      `/org/${orgSlug}/projects/${project.id}`
                    )
                  }
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{project.name}</div>
                    {project.description && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground max-w-xs">
                        {project.description}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {new Date(project.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(project)}
                          title="Editar projeto"
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(project)}
                          title="Excluir projeto"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="size-4 text-destructive" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} projeto{data.total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Badge variant="outline">
              {page} / {data.totalPages}
            </Badge>
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

      <ProjectFormModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        orgSlug={orgSlug}
        project={editingProject}
      />
    </div>
  );
}
