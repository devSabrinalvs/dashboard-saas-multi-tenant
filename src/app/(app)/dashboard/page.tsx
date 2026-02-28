import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const placeholderCards = [
  { title: "Usuários", description: "Total de usuários ativos" },
  { title: "Receita", description: "Receita mensal recorrente" },
  { title: "Projetos", description: "Projetos em andamento" },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bem-vindo ao seu painel.
        </p>
      </div>

      {/* Placeholder metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {placeholderCards.map(({ title, description }) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardDescription>{description}</CardDescription>
              <CardTitle className="text-2xl">—</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Dados disponíveis em breve
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder content area */}
      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
          <CardDescription>
            Conteúdo do dashboard será implementado em uma etapa futura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">Placeholder</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
