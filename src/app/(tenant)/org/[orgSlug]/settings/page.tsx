import { requireOrgContext } from "@/server/org/require-org-context";
import { findUserTwoFactorData } from "@/server/repo/two-factor-repo";
import { getUserDeletionInfo } from "@/server/repo/account-repo";
import { getReauthMethodType } from "@/server/use-cases/delete-account";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TwoFactorPanel } from "@/features/auth/components/two-factor-panel";
import { SessionsPanel } from "@/features/auth/components/sessions-panel";
import { TrustedDevicesPanel } from "@/features/auth/components/trusted-devices-panel";
import { DangerZonePanel } from "@/features/auth/components/danger-zone-panel";
import { ProfilePanel } from "@/features/auth/components/profile-panel";
import { ChangePasswordPanel } from "@/features/auth/components/change-password-panel";
import { OrgTagsPanel } from "@/features/tags/components/org-tags-panel";
import { WebhooksPanel } from "@/features/webhooks/components/webhooks-panel";
import { OrgSettingsPanel } from "@/features/org/components/org-settings-panel";
import { ApiKeysPanel } from "@/features/org/components/api-keys-panel";
import { CustomFieldsManager } from "@/features/org/components/custom-fields-manager";
import { can } from "@/security/rbac";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const [twoFactorData, deletionInfo, userProfile] = await Promise.all([
    findUserTwoFactorData(ctx.userId),
    getUserDeletionInfo(ctx.userId),
    prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, password: true },
    }),
  ]);
  const twoFactorEnabled = twoFactorData?.twoFactorEnabled ?? false;
  const canManageTags = can(ctx.role, "task:update");
  const canManageWebhooks = can(ctx.role, "member:invite");
  const isOwner = ctx.role === "OWNER";
  const reauthMethod = getReauthMethodType({
    password: deletionInfo?.hasPassword ? "exists" : null,
    twoFactorEnabled: twoFactorEnabled,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Configurações de{" "}
          <span className="font-medium text-foreground">{ctx.orgName}</span>.
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        {/* Org Settings — OWNER only */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organização</CardTitle>
              <CardDescription>
                Nome, slug de URL e exclusão da organização.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrgSettingsPanel orgSlug={orgSlug} orgName={ctx.orgName} isOwner={isOwner} />
            </CardContent>
          </Card>
        )}
        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil</CardTitle>
            <CardDescription>
              Seu nome de exibição e informações públicas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfilePanel
              name={userProfile?.name ?? null}
              email={ctx.email}
            />
          </CardContent>
        </Card>

        {/* Conta — trocar senha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Senha</CardTitle>
            <CardDescription>
              Altere sua senha de acesso. Mínimo de 8 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordPanel hasPassword={!!userProfile?.password} />
          </CardContent>
        </Card>

        {/* Segurança — 2FA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Autenticação de dois fatores</CardTitle>
            <CardDescription>
              Proteja sua conta com TOTP (Google Authenticator, Authy, etc.).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TwoFactorPanel isEnabled={twoFactorEnabled} />
          </CardContent>
        </Card>

        {/* Sessões ativas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessões ativas</CardTitle>
            <CardDescription>
              Veja e encerre sessões abertas em outros dispositivos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsPanel />
          </CardContent>
        </Card>

        {/* Dispositivos de confiança (2FA) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispositivos de confiança</CardTitle>
            <CardDescription>
              Dispositivos que pulam o 2FA por 30 dias. Revogue se perder acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrustedDevicesPanel />
          </CardContent>
        </Card>

        {/* Tags da Organização */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tags</CardTitle>
            <CardDescription>
              Gerencie as tags disponíveis para categorizar tarefas nesta organização.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrgTagsPanel orgSlug={orgSlug} canManage={canManageTags} />
          </CardContent>
        </Card>

        {/* Campos Customizados — ADMIN+ */}
        {canManageWebhooks && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campos Customizados</CardTitle>
              <CardDescription>
                Adicione campos extras às tarefas desta organização (texto, número, data, seleção).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomFieldsManager orgSlug={orgSlug} />
            </CardContent>
          </Card>
        )}

        {/* API Keys — OWNER only */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription>
                Chaves de API para integrações externas. Cada chave é exibida apenas uma vez.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeysPanel orgSlug={orgSlug} />
            </CardContent>
          </Card>
        )}

        {/* Webhooks */}
        {canManageWebhooks && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Webhooks</CardTitle>
              <CardDescription>
                Receba eventos da organização em sistemas externos via HTTP POST.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WebhooksPanel orgSlug={orgSlug} />
            </CardContent>
          </Card>
        )}

        {/* Zona de Risco */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Zona de risco</CardTitle>
            <CardDescription>
              Ações irreversíveis. Leia com atenção antes de prosseguir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DangerZonePanel
              userEmail={ctx.email}
              reauthMethod={reauthMethod}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
