"use client";

import { useState } from "react";
import { Bookmark, ChevronDown, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSavedFilters, type FilterState } from "@/features/tasks/hooks/use-saved-filters";

interface SavedFiltersMenuProps {
  orgSlug: string;
  projectId: string;
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
}

export function SavedFiltersMenu({
  orgSlug,
  projectId,
  currentFilters,
  onApply,
  onReset,
}: SavedFiltersMenuProps) {
  const { savedFilters, saveFilter, removeFilter, setDefault } = useSavedFilters(
    orgSlug,
    projectId
  );
  const [saveName, setSaveName] = useState("");
  const [open, setOpen] = useState(false);

  function handleSave() {
    const name = saveName.trim();
    if (!name) return;
    saveFilter(name, currentFilters);
    setSaveName("");
    setOpen(false);
  }

  const defaultFilter = savedFilters.find((f) => f.isDefault);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="saved-filters-trigger"
          className="gap-1"
        >
          <Bookmark className="size-3.5" />
          Filtros
          {savedFilters.length > 0 && (
            <span className="rounded-full bg-primary/20 px-1.5 text-xs font-medium">
              {savedFilters.length}
            </span>
          )}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64" data-testid="saved-filters-menu">
        {/* Save current */}
        <div className="p-2 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Salvar filtro atual
          </p>
          <div className="flex gap-1">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="Nome do filtro…"
              className="h-7 text-xs"
              maxLength={50}
            />
            <Button size="sm" onClick={handleSave} disabled={!saveName.trim()}>
              Salvar
            </Button>
          </div>
        </div>

        {savedFilters.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
              Filtros salvos
            </DropdownMenuLabel>

            {savedFilters.map((sf) => (
              <DropdownMenuItem
                key={sf.id}
                className="flex items-center justify-between pr-1 group"
                onSelect={(e) => e.preventDefault()}
              >
                <button
                  className="flex flex-1 items-center gap-1.5 text-sm text-left"
                  onClick={() => {
                    onApply(sf.filters);
                    setOpen(false);
                  }}
                  data-testid={`saved-filter-${sf.id}`}
                >
                  {sf.isDefault && (
                    <Star className="size-3 text-amber-500 shrink-0" fill="currentColor" />
                  )}
                  <span className="truncate">{sf.name}</span>
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!sf.isDefault && (
                    <button
                      onClick={() => setDefault(sf.id)}
                      className="rounded p-1 hover:bg-muted"
                      title="Definir como padrão"
                    >
                      <Star className="size-3 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => removeFilter(sf.id)}
                    className="rounded p-1 hover:bg-muted hover:text-destructive"
                    title="Remover filtro"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => { onReset(); setOpen(false); }}
          className="text-muted-foreground"
          data-testid="reset-filters-btn"
        >
          Resetar filtros
          {defaultFilter && (
            <span className="ml-auto text-xs text-muted-foreground">
              (aplicar padrão)
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
