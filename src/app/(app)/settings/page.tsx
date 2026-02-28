import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as configurações da sua conta e preferências.
        </p>
      </div>

      <Separator />

      {/* Placeholder sections */}
      <div className="space-y-4">
        {["Perfil", "Conta", "Notificações", "Segurança"].map((section) => (
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
