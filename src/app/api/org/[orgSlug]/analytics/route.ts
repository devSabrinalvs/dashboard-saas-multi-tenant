/**
 * GET /api/org/[orgSlug]/analytics
 * Retorna dados agregados para os gráficos do dashboard:
 *  - tasksByStatus: tasks abertas/concluídas por semana (últimas 8 semanas)
 *  - tasksByMember: total de tasks por membro (top 8)
 *  - tasksByPriority: distribuição por prioridade
 */
import { NextResponse } from "next/server";
import { requireOrgContext } from "@/server/org/require-org-context";
import { prisma } from "@/lib/prisma";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const now = new Date();
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

  // ── Tasks por semana (criadas vs concluídas) ────────────────────────────
  const recentTasks = await prisma.task.findMany({
    where: { orgId: ctx.orgId, parentTaskId: null, createdAt: { gte: eightWeeksAgo } },
    select: { createdAt: true, status: true },
  });

  // Gerar labels das últimas 8 semanas
  const weeks: { label: string; start: Date }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    weeks.push({ label: weekLabel(startOfWeek(d)), start: startOfWeek(d) });
  }

  const tasksByWeek = weeks.map(({ label, start }) => {
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const inWeek = recentTasks.filter(
      (t) => new Date(t.createdAt) >= start && new Date(t.createdAt) < end
    );
    return {
      week: label,
      criadas: inWeek.length,
      concluidas: inWeek.filter((t) => t.status === "DONE").length,
    };
  });

  // ── Tasks por membro (top 8) ────────────────────────────────────────────
  const assignedTasks = await prisma.task.findMany({
    where: { orgId: ctx.orgId, parentTaskId: null, assigneeUserId: { not: null } },
    select: { assigneeUserId: true, status: true },
  });

  const memberCounts: Record<string, { total: number; done: number }> = {};
  for (const t of assignedTasks) {
    if (!t.assigneeUserId) continue;
    memberCounts[t.assigneeUserId] ??= { total: 0, done: 0 };
    memberCounts[t.assigneeUserId]!.total++;
    if (t.status === "DONE") memberCounts[t.assigneeUserId]!.done++;
  }

  // Buscar nomes dos membros
  const memberIds = Object.keys(memberCounts);
  const users = memberIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, name: true, email: true },
      })
    : [];

  const tasksByMember = users
    .map((u) => ({
      membro: u.name ?? u.email.split("@")[0] ?? "—",
      tarefas: memberCounts[u.id]?.total ?? 0,
      concluidas: memberCounts[u.id]?.done ?? 0,
    }))
    .sort((a, b) => b.tarefas - a.tarefas)
    .slice(0, 8);

  // ── Tasks por prioridade ────────────────────────────────────────────────
  const allTasks = await prisma.task.findMany({
    where: { orgId: ctx.orgId, parentTaskId: null },
    select: { priority: true },
  });

  const priorityCount: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  for (const t of allTasks) priorityCount[t.priority] = (priorityCount[t.priority] ?? 0) + 1;

  const tasksByPriority = [
    { prioridade: "Baixa", total: priorityCount.LOW ?? 0, fill: "#94a3b8" },
    { prioridade: "Média", total: priorityCount.MEDIUM ?? 0, fill: "#3b82f6" },
    { prioridade: "Alta", total: priorityCount.HIGH ?? 0, fill: "#f59e0b" },
    { prioridade: "Urgente", total: priorityCount.URGENT ?? 0, fill: "#ef4444" },
  ];

  return NextResponse.json({ tasksByWeek, tasksByMember, tasksByPriority });
}
