import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "Dashboard SaaS Multi-tenant",
  description: "Etapa 1 — Auth",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
