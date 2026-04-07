import { useState, useCallback } from "react";

export function useTaskSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const isAllSelected = (ids: string[]) =>
    ids.length > 0 && ids.every((id) => selected.has(id));

  const isIndeterminate = (ids: string[]) =>
    ids.some((id) => selected.has(id)) && !isAllSelected(ids);

  return { selected, toggle, selectAll, clearAll, isAllSelected, isIndeterminate };
}
