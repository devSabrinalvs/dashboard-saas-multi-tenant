import { useState, useCallback, useEffect } from "react";

export type FilterState = {
  search: string;
  status: string;
  tag: string;
  pageSize: number;
};

type SavedFilter = {
  id: string;
  name: string;
  filters: FilterState;
  isDefault: boolean;
  createdAt: string;
};

function storageKey(orgSlug: string, projectId: string) {
  return `sf:${orgSlug}:tasks:${projectId}`;
}

function readFromStorage(key: string): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as SavedFilter[];
  } catch {
    return [];
  }
}

function writeToStorage(key: string, filters: SavedFilter[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(filters));
  } catch {
    // silently ignore storage errors
  }
}

/**
 * Gerencia filtros salvos no localStorage por org + projeto.
 * Sem dependência de DB — funciona offline e não altera schema Prisma.
 */
export function useSavedFilters(orgSlug: string, projectId: string) {
  const key = storageKey(orgSlug, projectId);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setSavedFilters(readFromStorage(key));
  }, [key]);

  const persist = useCallback(
    (filters: SavedFilter[]) => {
      setSavedFilters(filters);
      writeToStorage(key, filters);
    },
    [key]
  );

  const saveFilter = useCallback(
    (name: string, filters: FilterState) => {
      const next: SavedFilter[] = [
        ...savedFilters,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          filters,
          isDefault: savedFilters.length === 0, // primeiro salvo vira default
          createdAt: new Date().toISOString(),
        },
      ];
      persist(next);
    },
    [savedFilters, persist]
  );

  const removeFilter = useCallback(
    (id: string) => {
      persist(savedFilters.filter((f) => f.id !== id));
    },
    [savedFilters, persist]
  );

  const setDefault = useCallback(
    (id: string) => {
      persist(savedFilters.map((f) => ({ ...f, isDefault: f.id === id })));
    },
    [savedFilters, persist]
  );

  const getDefault = useCallback((): FilterState | null => {
    return savedFilters.find((f) => f.isDefault)?.filters ?? null;
  }, [savedFilters]);

  return { savedFilters, saveFilter, removeFilter, setDefault, getDefault };
}
