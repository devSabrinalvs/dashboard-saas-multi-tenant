import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

interface CreateUserData {
  email: string;
  name?: string;
  /** Valor já hasheado com bcrypt + pepper. Armazenado no campo `password` do User. */
  passwordHash: string;
}

/**
 * Cria um novo usuário com email/senha.
 * emailVerified começa como null até o usuário confirmar via link.
 */
export async function createUser(data: CreateUserData): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      password: data.passwordHash,
      emailVerified: null,
    },
  });
}

/**
 * Busca um usuário pelo email (case-sensitive — normalize antes de chamar).
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

/**
 * Marca o email do usuário como verificado com o timestamp atual.
 */
export async function markEmailVerified(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
}

/**
 * Incrementa o contador de falhas de login e aplica bloqueio se necessário.
 * @param lockedUntil - se não-null, seta lockedUntil na conta
 */
export async function incrementFailedLogin(
  userId: string,
  lockedUntil: Date | null
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: { increment: 1 },
      lastFailedLoginAt: new Date(),
      ...(lockedUntil !== null ? { lockedUntil } : {}),
    },
  });
}

/**
 * Reseta contadores de lockout após login bem-sucedido.
 */
export async function resetLoginCounters(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastFailedLoginAt: null,
      lastLoginAt: new Date(),
    },
  });
}

/**
 * Atualiza o timestamp do último alerta de segurança enviado.
 */
export async function updateLastSecurityAlertAt(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastSecurityAlertAt: new Date() },
  });
}
