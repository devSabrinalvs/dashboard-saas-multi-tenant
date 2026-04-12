"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { LayoutTemplate, ChevronRight, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiClient } from "@/shared/api/client";

interface TemplateTask {
  title: string;
  status: string;
  priority: string;
  tags: string[];
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string | null;
  tasksJson: TemplateTask[];
  isSystem: boolean;
  orgId: string | null;
}

interface ProjectTemplatePickerProps {
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectTemplatePicker({ orgSlug, open, onOpenChange }: ProjectTemplatePickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["project-templates", orgSlug],
    queryFn: () => apiClient.get<{ templates: ProjectTemplate[] }>(`/api/org/${orgSlug}/templates`),
    enabled: open,
  });

  const applyMutation = useMutation({
    mutationFn: ({ templateId, name, description }: { templateId: string; name: string; description?: string }) =>
      apiClient.post<{ project: { id: string }; tasksCreated: number }>(
        `/api/org/${orgSlug}/templates/${templateId}/apply`,
        { projectName: name, projectDescription: description }
      ),
    onSuccess: (result) => {
      onOpenChange(false);
      router.push(`/org/${orgSlug}/projects/${result.project.id}`);
    },
  });

  function handleBack() {
    setSelected(null);
    setProjectName("");
    setProjectDescription("");
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !projectName.trim()) return;
    await applyMutation.mutateAsync({
      templateId: selected.id,
      name: projectName.trim(),
      description: projectDescription.trim() || undefined,
    });
  }

  const templates = data?.templates ?? [];
  const systemTemplates = templates.filter((t) => t.isSystem);
  const orgTemplates = templates.filter((t) => !t.isSystem);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-4" />
            {selected ? `Criar de "${selected.name}"` : "Criar projeto a partir de template"}
          </DialogTitle>
        </DialogHeader>

        {!selected ? (
          /* Template picker */
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum template disponível.
              </p>
            ) : (
              <>
                {systemTemplates.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sistema</p>
                    {systemTemplates.map((t) => (
                      <TemplateCard key={t.id} template={t} onSelect={setSelected} />
                    ))}
                  </div>
                )}
                {orgTemplates.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Da organização</p>
                    {orgTemplates.map((t) => (
                      <TemplateCard key={t.id} template={t} onSelect={setSelected} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Config form */
          <form onSubmit={(e) => void handleApply(e)} className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{selected.name}</p>
              {selected.description && <p className="text-muted-foreground mt-0.5">{selected.description}</p>}
              <p className="text-muted-foreground mt-1">
                {(selected.tasksJson as TemplateTask[]).length} tarefa{(selected.tasksJson as TemplateTask[]).length !== 1 ? "s" : ""} incluída{(selected.tasksJson as TemplateTask[]).length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nome do projeto *</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Sprint Q1, Website Redesign…"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Descrição do projeto…"
                className="h-8 text-sm"
              />
            </div>

            {applyMutation.error && (
              <p className="text-xs text-destructive">{applyMutation.error.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!projectName.trim() || applyMutation.isPending}
              >
                {applyMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Criar projeto
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template, onSelect }: { template: ProjectTemplate; onSelect: (t: ProjectTemplate) => void }) {
  const taskCount = (template.tasksJson as TemplateTask[]).length;
  return (
    <button
      onClick={() => onSelect(template)}
      className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors flex items-center gap-3 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{template.name}</p>
          {template.isSystem && <Star className="size-3 text-amber-500 shrink-0" />}
        </div>
        {template.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{template.description}</p>
        )}
        <Badge variant="secondary" className="text-xs mt-1 px-1.5 py-0">
          {taskCount} tarefa{taskCount !== 1 ? "s" : ""}
        </Badge>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
