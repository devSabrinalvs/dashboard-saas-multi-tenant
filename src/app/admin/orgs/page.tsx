import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { searchAdminOrgs } from "@/server/repo/admin-org-repo";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

const PLAN_LABELS: Record<string, string> = {
  FREE: "Free",
  PRO: "Pro",
  BUSINESS: "Business",
};

export default async function AdminOrgsPage({ searchParams }: PageProps) {
  await requireSuperAdmin();
  const { search = "" } = await searchParams;

  const orgs = search.trim().length > 0 ? await searchAdminOrgs(search.trim()) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Organizações</h2>
        <p className="text-sm text-muted-foreground">
          Busque por nome ou slug. Mínimo 1 caractere.
        </p>
      </div>

      <form className="flex gap-2">
        <Input
          name="search"
          defaultValue={search}
          placeholder="Nome ou slug da org..."
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
          {orgs.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhuma org encontrada para &quot;{search}&quot;.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Slug</th>
                  <th className="px-4 py-3 text-left font-medium">Nome</th>
                  <th className="px-4 py-3 text-left font-medium">Plano</th>
                  <th className="px-4 py-3 text-left font-medium">Membros</th>
                  <th className="px-4 py-3 text-left font-medium">Projetos</th>
                  <th className="px-4 py-3 text-left font-medium">Criado em</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orgs.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{o.slug}</td>
                    <td className="px-4 py-3">{o.name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={o.plan === "FREE" ? "outline" : "secondary"}
                      >
                        {PLAN_LABELS[o.plan] ?? o.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{o.memberCount}</td>
                    <td className="px-4 py-3">{o.projectCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orgs/${o.id}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
