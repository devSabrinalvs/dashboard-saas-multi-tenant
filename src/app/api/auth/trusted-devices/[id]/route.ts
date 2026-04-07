/**
 * DELETE /api/auth/trusted-devices/[id]
 * Revoga um dispositivo de confiança (verifica ownership antes).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { revokeTrustedDeviceById } from "@/server/repo/two-factor-repo";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const revoked = await revokeTrustedDeviceById(id, session.user.id);

  if (!revoked) {
    return NextResponse.json(
      { error: "Dispositivo não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
