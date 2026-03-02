import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { acceptInvite } from "@/server/use-cases/accept-invite";
import {
  InviteNotFoundError,
  InviteExpiredError,
  InviteEmailMismatchError,
} from "@/server/errors/team-errors";

/**
 * POST /api/invite/[token]/accept
 *
 * Aceita um convite e cria o membership do usuário logado na org do convite.
 * Não usa requireOrgContext — o token é a chave de acesso.
 * Usa getSession() (não requireAuth()) para retornar 401 em vez de redirect.
 *
 * Success: 200 { orgSlug, orgName }
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { token } = await params;

    const result = await acceptInvite({
      token,
      userId: session.user.id,
      userEmail: session.user.email,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof InviteNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof InviteExpiredError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof InviteEmailMismatchError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
