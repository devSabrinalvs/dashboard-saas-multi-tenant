"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectCreateSchema, type ProjectCreateInput } from "@/schemas/project";
import { useCreateProject } from "@/features/projects/hooks/use-create-project";
import { useUpdateProject } from "@/features/projects/hooks/use-update-project";
import type { Project } from "@/server/repo/project-repo";

interface ProjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  /** Se fornecido, modo edição. Caso contrário, modo criação. */
  project?: Project;
}

export function ProjectFormModal({
  open,
  onOpenChange,
  orgSlug,
  project,
}: ProjectFormModalProps) {
  const isEditing = !!project;
  const createMutation = useCreateProject(orgSlug);
  const updateMutation = useUpdateProject(orgSlug);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectCreateInput>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
    },
  });

  // Sincronizar valores ao abrir modal de edição
  useEffect(() => {
    if (open) {
      reset({
        name: project?.name ?? "",
        description: project?.description ?? "",
      });
    }
  }, [open, project, reset]);

  async function onSubmit(data: ProjectCreateInput) {
    if (isEditing && project) {
      updateMutation.mutate(
        { projectId: project.id, data },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar projeto" : "Novo projeto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="project-name">Nome *</Label>
            <Input
              id="project-name"
              placeholder="Nome do projeto"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="project-description">Descrição</Label>
            <Textarea
              id="project-description"
              placeholder="Descrição do projeto (opcional)"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {(createMutation.error ?? updateMutation.error) && (
            <p className="text-sm text-destructive">
              {(createMutation.error ?? updateMutation.error)?.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
