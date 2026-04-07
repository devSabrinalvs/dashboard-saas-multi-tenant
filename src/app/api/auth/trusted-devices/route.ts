/**
 * GET /api/auth/trusted-devices
 * Retorna dispositivos de confiança ativos do usuário autenticado.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth/options";
import { listTrustedDevices } from "@/server/repo/two-factor-repo";
import { parseDeviceLabel } from "@/server/security/session-utils";

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const devices = await listTrustedDevices(session.user.id);

  const result = devices.map((d) => ({
    id: d.id,
    deviceLabel: parseDeviceLabel(d.userAgent),
    ip: d.ip,
    createdAt: d.createdAt,
    lastUsedAt: d.lastUsedAt,
    expiresAt: d.expiresAt,
  }));

  return NextResponse.json(result);
}
