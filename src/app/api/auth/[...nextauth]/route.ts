import NextAuth from "next-auth";
import { authOptions } from "@/auth/options";
import { NextResponse } from "next/server";
import { rateLimit } from "@/security/rate-limit/rate-limit";
import { loginIpKey, getClientIp } from "@/security/rate-limit/keys";
import { RATE_LIMITS } from "@/security/rate-limit/constants";

const handler = NextAuth(authOptions);

export { handler as GET };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  const ip = getClientIp(req);
  const rl = await rateLimit(loginIpKey(ip), RATE_LIMITS.LOGIN_IP);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Tente novamente mais tarde.", resetAt: rl.resetAt },
      { status: 429 }
    );
  }
  return handler(req as Parameters<typeof handler>[0], ctx as Parameters<typeof handler>[1]);
}
