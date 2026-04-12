/**
 * Digest semanal — envia email para todos os membros de todas as orgs com:
 *   - Tarefas abertas atribuídas a eles
 *   - Tarefas concluídas na última semana atribuídas a eles
 *
 * Executado via cron job toda segunda-feira cedo (ou outro dia configurado).
 * Best-effort: falhas por org/membro não interrompem os demais.
 */

import { prisma } from "@/lib/prisma";
import { getMailer } from "@/server/email/mailer";

const BASE_URL =
  process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

interface DigestTask {
  title: string;
  projectName: string;
}

interface DigestResult {
  orgsProcessed: number;
  emailsSent: number;
  errors: number;
}

export async function sendWeeklyDigest(): Promise<DigestResult> {
  const mailer = getMailer();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let orgsProcessed = 0;
  let emailsSent = 0;
  let errors = 0;

  // 1. Buscar todas as orgs ativas
  const orgs = await prisma.$queryRaw<
    { id: string; name: string; slug: string }[]
  >`SELECT id, name, slug FROM "Organization" ORDER BY "createdAt" ASC`;

  for (const org of orgs) {
    orgsProcessed++;
    try {
      // 2. Buscar membros da org (OWNER, ADMIN, MEMBER — excluir VIEWER)
      const members = await prisma.$queryRaw<
        { userId: string; role: string; name: string | null; email: string }[]
      >`
        SELECT m."userId", m.role, u.name, u.email
        FROM "Membership" m
        JOIN "User" u ON u.id = m."userId"
        WHERE m."orgId" = ${org.id}
          AND m.role IN ('OWNER', 'ADMIN', 'MEMBER')
          AND u.email IS NOT NULL
      `;

      for (const member of members) {
        try {
          // 3. Tarefas abertas atribuídas ao membro
          const openTasks = await prisma.$queryRaw<
            { title: string; projectName: string }[]
          >`
            SELECT t.title, p.name AS "projectName"
            FROM "Task" t
            JOIN "Project" p ON p.id = t."projectId"
            WHERE t."orgId" = ${org.id}
              AND t."assigneeUserId" = ${member.userId}
              AND t.status != 'DONE'
            ORDER BY t."createdAt" DESC
            LIMIT 20
          `;

          // 4. Tarefas concluídas esta semana atribuídas ao membro
          const completedThisWeek = await prisma.$queryRaw<
            { title: string; projectName: string }[]
          >`
            SELECT t.title, p.name AS "projectName"
            FROM "Task" t
            JOIN "Project" p ON p.id = t."projectId"
            WHERE t."orgId" = ${org.id}
              AND t."assigneeUserId" = ${member.userId}
              AND t.status = 'DONE'
              AND t."updatedAt" >= ${weekAgo}
            ORDER BY t."updatedAt" DESC
            LIMIT 20
          `;

          // Só envia se houver algo para mostrar
          if (openTasks.length === 0 && completedThisWeek.length === 0) continue;

          const orgUrl = `${BASE_URL}/org/${org.slug}/projects`;

          await mailer.sendWeeklyDigestEmail({
            to: member.email,
            name: member.name ?? member.email.split("@")[0] ?? member.email,
            orgName: org.name,
            orgUrl,
            openTasks: openTasks as DigestTask[],
            completedThisWeek: completedThisWeek as DigestTask[],
          });

          emailsSent++;
        } catch (memberErr) {
          console.error(
            `[weekly-digest] Erro ao enviar para ${member.email} (org ${org.slug}):`,
            memberErr
          );
          errors++;
        }
      }
    } catch (orgErr) {
      console.error(`[weekly-digest] Erro ao processar org ${org.slug}:`, orgErr);
      errors++;
    }
  }

  return { orgsProcessed, emailsSent, errors };
}
