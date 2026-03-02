import Link from "next/link";
import { getSession } from "@/auth";
import { findInviteByToken } from "@/server/repo/invite-repo";
import { AcceptInviteButton } from "@/components/invite/accept-invite-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [session, invite] = await Promise.all([
    getSession(),
    findInviteByToken(token),
  ]);

  const loggedInEmail = session?.user?.email ?? null;

  // Token inválido ou revogado
  if (!invite || invite.status === "REVOKED") {
    return (
      <InviteLayout>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Convite inválido</CardTitle>
            <CardDescription>
              Este link de convite não é válido ou foi revogado.
            </CardDescription>
          </CardHeader>
        </Card>
      </InviteLayout>
    );
  }

  // Expirado
  if (invite.expiresAt < new Date()) {
    return (
      <InviteLayout>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Convite expirado</CardTitle>
            <CardDescription>
              Este convite expirou em{" "}
              {new Intl.DateTimeFormat("pt-BR").format(invite.expiresAt)}.
            </CardDescription>
          </CardHeader>
        </Card>
      </InviteLayout>
    );
  }

  // Já aceito
  if (invite.status === "ACCEPTED") {
    return (
      <InviteLayout>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Convite já utilizado</CardTitle>
            <CardDescription>
              Este convite para <strong>{invite.organization.name}</strong> já
              foi aceito.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/org/${invite.organization.slug}/dashboard`}>
                Ir para o dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </InviteLayout>
    );
  }

  // Convite PENDING válido

  // Não logado
  if (!loggedInEmail) {
    return (
      <InviteLayout>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Você foi convidado</CardTitle>
            <CardDescription>
              Para se juntar a <strong>{invite.organization.name}</strong> como{" "}
              <strong>{invite.email}</strong>, faça login primeiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/login?callbackUrl=/invite/${token}`}>
                Fazer login para aceitar
              </Link>
            </Button>
          </CardContent>
        </Card>
      </InviteLayout>
    );
  }

  // Logado com email diferente
  if (loggedInEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <InviteLayout>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email diferente</CardTitle>
            <CardDescription>
              Este convite foi enviado para <strong>{invite.email}</strong>, mas
              você está logado como <strong>{loggedInEmail}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Para aceitar este convite, faça login com o email correto.
            </p>
          </CardContent>
        </Card>
      </InviteLayout>
    );
  }

  // Logado com email correto — mostrar botão de aceitar
  return (
    <InviteLayout>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Você foi convidado</CardTitle>
          <CardDescription>
            Para se juntar a <strong>{invite.organization.name}</strong> como{" "}
            <strong>{invite.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInviteButton token={token} />
        </CardContent>
      </Card>
    </InviteLayout>
  );
}

function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {children}
    </div>
  );
}
