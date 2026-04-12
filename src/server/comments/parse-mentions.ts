import { prisma } from "@/lib/prisma";

/**
 * Extrai @menções de um comentário e retorna os userIds dos membros
 * da org que correspondem (por nome ou email). Best-effort, sem throw.
 */
export async function parseMentions(
  content: string,
  orgId: string,
  authorId: string
): Promise<string[]> {
  const handles = [
    ...new Set(content.match(/@([\w.+-]+)/g)?.map((m) => m.slice(1).toLowerCase()) ?? []),
  ];
  if (handles.length === 0) return [];

  // Busca todos os membros da org com nome/email para comparação em memória
  const members = await prisma.$queryRaw<{ userId: string; name: string | null; email: string }[]>`
    SELECT m."userId", u.name, u.email
    FROM "Membership" m
    JOIN "User" u ON u.id = m."userId"
    WHERE m."orgId" = ${orgId}
      AND m."userId" != ${authorId}
  `;

  const mentioned = new Set<string>();
  for (const member of members) {
    const nameLower = (member.name ?? "").toLowerCase();
    const emailLower = member.email.toLowerCase();
    for (const handle of handles) {
      if (nameLower.includes(handle) || emailLower.includes(handle)) {
        mentioned.add(member.userId);
        break;
      }
    }
  }

  return [...mentioned];
}
