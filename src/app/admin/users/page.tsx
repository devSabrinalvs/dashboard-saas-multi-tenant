import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { searchAdminUsers } from "@/server/repo/admin-user-repo";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const { search = "" } = await searchParams;

  const users = search.trim().length > 0 ? await searchAdminUsers(search.trim()) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Usuários</h2>
        <p className="text-sm text-muted-foreground">
          Busque por email. Mínimo 1 caractere.
        </p>
      </div>

      <form className="flex gap-2">
        <Input
          name="search"
          defaultValue={search}
          placeholder="Email do usuário..."
          className="max-w-sm"
          autoComplete="off"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Buscar
        </button>
      </form>

      {search.trim().length > 0 && (
        <div className="rounded-md border">
          {users.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum usuário encontrado para &quot;{search}&quot;.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Verificado</th>
                  <th className="px-4 py-3 text-left font-medium">2FA</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Último login</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => {
                  const isLocked = !!u.lockedUntil && new Date(u.lockedUntil) > new Date();
                  const isDeleted = !!u.deletedAt;
                  return (
                    <tr key={u.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        {u.emailVerified ? (
                          <Badge variant="secondary">Sim</Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.twoFactorEnabled ? (
                          <Badge variant="secondary">Ativo</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isDeleted ? (
                          <Badge variant="destructive">Deletado</Badge>
                        ) : isLocked ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : (
                          <Badge variant="secondary">Ativo</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
