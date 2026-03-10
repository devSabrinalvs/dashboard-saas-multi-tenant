import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-6 text-primary" aria-hidden />
          </div>
          <div>
            <CardTitle>Recuperar senha</CardTitle>
            <CardDescription className="mt-1.5">
              Esta funcionalidade será implementada na Etapa B, com envio de
              email de redefinição de senha.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">← Voltar para o login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
