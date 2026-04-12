"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FolderOpen, CheckSquare } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useGlobalSearch } from "@/features/search/hooks/use-global-search";

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-slate-400",
  IN_PROGRESS: "bg-blue-500",
  DONE: "bg-green-500",
  CANCELED: "bg-red-400",
};

interface GlobalSearchDialogProps {
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({
  orgSlug,
  open,
  onOpenChange,
}: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data, isFetching } = useGlobalSearch(orgSlug, query);

  // Reset query when closing
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function handleTaskSelect(projectId: string, taskId: string) {
    onOpenChange(false);
    router.push(`/org/${orgSlug}/projects/${projectId}?taskId=${taskId}`);
  }

  function handleProjectSelect(projectId: string) {
    onOpenChange(false);
    router.push(`/org/${orgSlug}/projects/${projectId}`);
  }

  const hasTasks = (data?.tasks?.length ?? 0) > 0;
  const hasProjects = (data?.projects?.length ?? 0) > 0;
  const hasResults = hasTasks || hasProjects;
  const showEmpty = query.length >= 2 && !isFetching && !hasResults;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Busca Global"
      description="Buscar tarefas e projetos"
    >
      <CommandInput
        placeholder="Buscar tarefas e projetos…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isFetching && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {showEmpty && (
          <CommandEmpty>Sem resultados para &ldquo;{query}&rdquo;</CommandEmpty>
        )}

        {query.length < 2 && !isFetching && (
          <CommandEmpty className="text-muted-foreground">
            Digite pelo menos 2 caracteres para buscar
          </CommandEmpty>
        )}

        {hasTasks && (
          <CommandGroup heading="Tarefas">
            {data!.tasks.map((task) => (
              <CommandItem
                key={task.id}
                value={`task-${task.id}-${task.title}`}
                onSelect={() => handleTaskSelect(task.projectId, task.id)}
                className="flex items-center gap-2"
              >
                <span
                  className={`size-2 rounded-full shrink-0 ${STATUS_DOT[task.status] ?? "bg-slate-400"}`}
                />
                <CheckSquare className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{task.title}</span>
                {task.projectName && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                    {task.projectName}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {hasTasks && hasProjects && <CommandSeparator />}

        {hasProjects && (
          <CommandGroup heading="Projetos">
            {data!.projects.map((project) => (
              <CommandItem
                key={project.id}
                value={`project-${project.id}-${project.name}`}
                onSelect={() => handleProjectSelect(project.id)}
                className="flex items-center gap-2"
              >
                <FolderOpen className="size-4 text-muted-foreground shrink-0" />
                <span className="truncate">{project.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
