import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Dashboard SaaS",
  description: "Etapa 7 — Projects + Tasks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <SessionProvider>
            <Providers>{children}</Providers>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
