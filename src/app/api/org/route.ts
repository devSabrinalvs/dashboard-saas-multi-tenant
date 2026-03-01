import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/require-auth";
import { createOrgApiSchema } from "@/schemas/organization";
import {
  createOrganization,
  SlugConflictError,
} from "@/server/use-cases/create-organization";

/**
 * POST /api/org
 *
 * Cria uma nova organização e vincula o usuário autenticado como OWNER.
 *
 * Body: { name: string, slug?: string }
 * Success: 201 { orgSlug: string }
 * Errors:
 *   401 → não autenticado (handled by requireAuth redirect)
 *   409 → slug já em uso
 *   422 → dados inválidos
 */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth();

    const body = (await req.json()) as unknown;
    const parsed = createOrgApiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", issues: parsed.error.issues },
        { status: 422 }
      );
    }

    const { orgSlug } = await createOrganization({
      ...parsed.data,
      userId: auth.userId,
    });

    return NextResponse.json({ orgSlug }, { status: 201 });
  } catch (err) {
    if (err instanceof SlugConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
