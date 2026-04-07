import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import Link from "next/link";
import { Building2, ClipboardList, Users } from "lucide-react";

export default async function AdminIndexPage() {
  const ctx = await requireSuperAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Bem-vindo ao Admin Console</h2>
        <p className="text-sm text-muted-foreground">
          Logado como <span className="font-mono">{ctx.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminCard
          href="/admin/users"
          icon={<Users className="size-6" />}
          title="Usuários"
          description="Buscar, desbloquear, revogar sessões, verificar email, desativar 2FA."
        />
        <AdminCard
          href="/admin/orgs"
          icon={<Building2 className="size-6" />}
          title="Organizações"
          description="Buscar orgs, visualizar membros, forçar plano."
        />
        <AdminCard
          href="/admin/audit"
          icon={<ClipboardList className="size-6" />}
          title="Audit Log"
          description="Registro append-only de todas as ações administrativas."
        />
      </div>
    </div>
  );
}

function AdminCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border p-4 hover:bg-muted/40 transition-colors"
    >
      <div className="mb-2 text-muted-foreground">{icon}</div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </Link>
  );
}
