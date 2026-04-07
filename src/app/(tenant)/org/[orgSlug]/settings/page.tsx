import { requireOrgContext } from "@/server/org/require-org-context";
import { findUserTwoFactorData } from "@/server/repo/two-factor-repo";
import { getUserDeletionInfo } from "@/server/repo/account-repo";
import { getReauthMethodType } from "@/server/use-cases/delete-account";
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

const placeholderSections = ["Perfil", "Conta", "Notificações"] as const;

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const [twoFactorData, deletionInfo] = await Promise.all([
    findUserTwoFactorData(ctx.userId),
    getUserDeletionInfo(ctx.userId),
  ]);
  const twoFactorEnabled = twoFactorData?.twoFactorEnabled ?? false;
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
        {placeholderSections.map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-base">{section}</CardTitle>
              <CardDescription>
                Configurações de {section.toLowerCase()} serão implementadas em
                uma etapa futura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-16 items-center justify-center rounded-md border border-dashed">
                <p className="text-xs text-muted-foreground">Placeholder</p>
              </div>
            </CardContent>
          </Card>
        ))}

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
