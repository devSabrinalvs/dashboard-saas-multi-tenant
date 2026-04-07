import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/schemas/auth";
import { resetPassword } from "@/server/use-cases/reset-password";
import { InvalidTokenError } from "@/server/errors/auth-errors";

export async function POST(req: Request): Promise<NextResponse> {
  // 1. Parse e validação do body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { token, newPassword } = parsed.data;

  // 2. Redefinir senha
  try {
    const result = await resetPassword({ token, newPassword });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return NextResponse.json(
        { error: "Link expirado ou inválido. Solicite um novo." },
        { status: 400 }
      );
    }
    console.error("[POST /api/auth/reset-password]", err);
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 }
    );
  }
}
