"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";

interface AuditClientProps {
  orgSlug: string;
}

export function AuditClient({ orgSlug }: AuditClientProps) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useAuditLogs(orgSlug, {
    search: search || undefined,
    action: action || undefined,
    actorId: actorId || undefined,
    page,
    pageSize: 10,
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="audit-search" className="text-xs text-muted-foreground">
            Busca
          </Label>
          <Input
            id="audit-search"
            placeholder="Buscar por action..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-52"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-action" className="text-xs text-muted-foreground">
            Action exata
          </Label>
          <Input
            id="audit-action"
            placeholder="Ex: project.created"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="w-52"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-actor" className="text-xs text-muted-foreground">
            Actor ID
          </Label>
          <Input
            id="audit-actor"
            placeholder="ID do usuário..."
            value={actorId}
            onChange={(e) => {
              setActorId(e.target.value);
              setPage(1);
            }}
            className="w-52"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-sm text-destructive">
          Erro ao carregar audit logs.
        </p>
      )}

      {/* Empty */}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={SlidersHorizontal}
          title="Nenhum audit log encontrado"
          subtitle="Tente ajustar os filtros de busca."
        />
      )}

      {/* Table */}
      {data && data.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Actor
                  </th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">
                    Metadata
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {log.actor?.email ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                      {JSON.stringify(log.metadata).slice(0, 80)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} registro{data.total !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="tabular-nums">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
