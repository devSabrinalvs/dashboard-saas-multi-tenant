import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  // Prisma adapter: persiste User e Account no banco.
  // Com JWT strategy, Session não é gravada no DB.
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, email: true, name: true, password: true },
        });

        if (!user?.password) return null;

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user.password
        );

        if (!passwordMatches) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Na primeira vez (login), `user` vem do authorize().
      // Nas chamadas seguintes, só `token` está presente.
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // Injeta o id do token na sessão acessível no servidor.
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
