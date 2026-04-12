"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearchDialog } from "./global-search-dialog";

interface GlobalSearchTriggerProps {
  orgSlug: string;
}

export function GlobalSearchTrigger({ orgSlug }: GlobalSearchTriggerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setOpen(true)}
        aria-label="Busca global (Ctrl+K)"
      >
        <Search className="size-4" />
        <span className="sr-only">Buscar</span>
      </Button>

      <GlobalSearchDialog open={open} onOpenChange={setOpen} orgSlug={orgSlug} />
    </>
  );
}
