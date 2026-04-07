import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { findAdminUserById } from "@/server/repo/admin-user-repo";
import { Badge } from "@/components/ui/badge";
import { AdminUserActions } from "@/features/admin/components/admin-user-actions";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  await requireSuperAdmin();
  const { userId } = await params;

  const user = await findAdminUserById(userId);
  if (!user) notFound();

  const isLocked = !!user.lockedUntil && new Date(user.lockedUntil) > new Date();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold">Usuário: {user.email}</h2>
        <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
      </div>

      {/* Info */}
      <div className="rounded-md border divide-y">
        <Row label="Email" value={user.email} />
        <Row
          label="Email verificado"
          value={
            user.emailVerified
              ? new Date(user.emailVerified).toLocaleString("pt-BR")
              : "Não verificado"
          }
        />
        <Row
          label="2FA"
          value={user.twoFactorEnabled ? "Ativo" : "Inativo"}
        />
        <Row
          label="Status da conta"
          value={
            user.deletedAt
              ? `Deletado em ${new Date(user.deletedAt).toLocaleString("pt-BR")}`
              : isLocked
              ? `Bloqueado até ${new Date(user.lockedUntil!).toLocaleString("pt-BR")}`
              : "Ativa"
          }
        />
        <Row label="Tentativas falhas" value={String(user.failedLoginCount)} />
        <Row
          label="Último login"
          value={
            user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString("pt-BR")
              : "—"
          }
        />
        <Row label="Orgs" value={String(user.orgCount)} />
        <Row label="Sessões ativas" value={String(user.activeSessionCount)} />
        <Row
          label="Criado em"
          value={new Date(user.createdAt).toLocaleString("pt-BR")}
        />
      </div>

      {/* Ações */}
      <AdminUserActions
        userId={user.id}
        userEmail={user.email}
        isLocked={isLocked}
        hasActive2FA={user.twoFactorEnabled}
        emailVerified={!!user.emailVerified}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="w-44 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
