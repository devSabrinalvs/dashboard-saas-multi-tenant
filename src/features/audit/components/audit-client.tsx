"use client";

import { useState } from "react";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por action..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-56"
        />
        <Input
          placeholder="Filtrar por action exata..."
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="w-56"
        />
        <Input
          placeholder="Filtrar por actor ID..."
          value={actorId}
          onChange={(e) => {
            setActorId(e.target.value);
            setPage(1);
          }}
          className="w-56"
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Erro ao carregar audit logs.
        </p>
      )}

      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum audit log encontrado.
        </p>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Action</th>
                  <th className="px-4 py-2 text-left font-medium">Actor</th>
                  <th className="px-4 py-2 text-left font-medium">Metadata</th>
                  <th className="px-4 py-2 text-left font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {log.actor?.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                      {JSON.stringify(log.metadata).slice(0, 80)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} registro{data.total !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span>
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
              >
                Próxima →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
