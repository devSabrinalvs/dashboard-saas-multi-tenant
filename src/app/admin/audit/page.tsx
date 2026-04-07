import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { listAdminAuditLogs } from "@/server/repo/admin-audit-repo";
import { adminAuditQuerySchema } from "@/schemas/admin";
import { Input } from "@/components/ui/input";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  await requireSuperAdmin();

  const raw = await searchParams;
  const parsed = adminAuditQuerySchema.safeParse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: raw.search ?? "",
    action: raw.action ?? "",
  });
  const query = parsed.success ? parsed.data : { page: 1, pageSize: 20, search: "", action: "" };

  const result = await listAdminAuditLogs(query);
  const totalPages = Math.ceil(result.total / result.pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Admin Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          Registro append-only de todas as ações administrativas. {result.total} entradas no total.
        </p>
      </div>

      <form className="flex gap-2">
        <Input
          name="search"
          defaultValue={query.search}
          placeholder="Email admin ou target ID..."
          className="max-w-xs"
        />
        <Input
          name="action"
          defaultValue={query.action}
          placeholder="Ação (ex: admin.user.unlock)"
          className="max-w-xs"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filtrar
        </button>
      </form>

      <div className="rounded-md border">
        {result.entries.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nenhuma entrada encontrada.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Admin</th>
                <th className="px-4 py-3 text-left font-medium">Ação</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Target ID</th>
                <th className="px-4 py-3 text-left font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result.entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {entry.actorAdminEmail}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {entry.action}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.targetType}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {entry.targetId.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-xs truncate">
                    {JSON.stringify(entry.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação simples */}
      {totalPages > 1 && (
        <div className="flex gap-2 text-sm">
          {query.page > 1 && (
            <a
              href={`?page=${query.page - 1}&pageSize=${query.pageSize}&search=${query.search}&action=${query.action}`}
              className="rounded border px-3 py-1 hover:bg-muted"
            >
              Anterior
            </a>
          )}
          <span className="px-3 py-1 text-muted-foreground">
            Página {query.page} de {totalPages}
          </span>
          {query.page < totalPages && (
            <a
              href={`?page=${query.page + 1}&pageSize=${query.pageSize}&search=${query.search}&action=${query.action}`}
              className="rounded border px-3 py-1 hover:bg-muted"
            >
              Próxima
            </a>
          )}
        </div>
      )}
    </div>
  );
}
