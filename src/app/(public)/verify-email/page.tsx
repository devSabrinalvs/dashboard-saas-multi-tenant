import { redirect } from "next/navigation";
import Link from "next/link";
import { InvalidTokenError } from "@/server/errors/auth-errors";
import { verifyEmailToken } from "@/server/use-cases/verify-email-token";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  // Token ausente na URL
  if (!token) {
    return <VerifyError reason="missing" />;
  }

  try {
    await verifyEmailToken(token);
    // Sucesso: redireciona para login com flag de verified
    redirect("/login?verified=1");
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return <VerifyError reason="invalid" />;
    }
    // Repropaga erros inesperados (Next.js trata internamente)
    throw err;
  }
}

// ---------------------------------------------------------------------------
// UI de erro
// ---------------------------------------------------------------------------

function VerifyError({ reason }: { reason: "missing" | "invalid" }) {
  const title =
    reason === "missing"
      ? "Link incompleto"
      : "Link expirado ou inválido";

  const description =
    reason === "missing"
      ? "O link de verificação está incompleto. Clique no link completo do email ou solicite um novo."
      : "Este link de verificação expirou ou já foi utilizado. Solicite um novo link abaixo.";

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Icon */}
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="size-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/verify-email/pending"
            className="inline-flex h-10 items-center justify-center rounded-md bg-foreground px-6 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
          >
            Solicitar novo link
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
