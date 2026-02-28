import { requireOrgContext } from "@/server/org/require-org-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const settingSections = [
  "Perfil",
  "Conta",
  "Notificações",
  "Segurança",
] as const;

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

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
        {settingSections.map((section) => (
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
      </div>
    </div>
  );
}
