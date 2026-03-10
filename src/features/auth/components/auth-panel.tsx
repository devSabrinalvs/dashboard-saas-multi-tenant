import {
  Users,
  FolderKanban,
  CheckSquare,
  Check,
  Building2,
  BarChart3,
} from "lucide-react";

interface AuthPanelProps {
  variant: "login" | "signup";
}

function FakeBarChart() {
  const bars = [45, 72, 58, 90, 68];
  return (
    <div
      className="flex items-end gap-1.5 h-16"
      role="img"
      aria-label="Gráfico de atividade"
    >
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-white/30"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-md bg-white/20 shrink-0">
        <Icon className="size-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/60 truncate">{label}</p>
        <p className="text-lg font-bold text-white tabular-nums leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

function LoginPanel() {
  return (
    <div className="flex h-full flex-col justify-between p-8 lg:p-12">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-white/20">
          <BarChart3 className="size-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">SaaS Dashboard</span>
      </div>

      {/* Main content */}
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Bem-vindo de volta
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Acesse seu dashboard e acompanhe tudo que acontece na sua
            organização em tempo real.
          </p>
        </div>

        {/* Metric cards */}
        <div className="space-y-2.5">
          <MetricCard icon={Users} label="Usuários ativos" value="1.248" />
          <MetricCard icon={FolderKanban} label="Projetos em andamento" value="34" />
          <MetricCard icon={CheckSquare} label="Tarefas concluídas" value="892" />
        </div>

        {/* Fake bar chart */}
        <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4 space-y-2">
          <p className="text-xs text-white/60">Atividade — últimos 5 dias</p>
          <FakeBarChart />
        </div>
      </div>

      {/* Footer quote */}
      <p className="text-xs text-white/40">
        Dados ilustrativos para demonstração
      </p>
    </div>
  );
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-6 items-center justify-center rounded-full bg-white/20 shrink-0">
        <Check className="size-3.5 text-white" strokeWidth={3} />
      </div>
      <span className="text-sm text-white/90">{label}</span>
    </div>
  );
}

function SignupPanel() {
  return (
    <div className="flex h-full flex-col justify-between p-8 lg:p-12">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-white/20">
          <BarChart3 className="size-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">SaaS Dashboard</span>
      </div>

      {/* Main content */}
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Crie seu workspace
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Configure sua organização em minutos e convide sua equipe para
            colaborar em projetos.
          </p>
        </div>

        {/* Feature checklist */}
        <div className="rounded-xl bg-white/10 backdrop-blur-sm p-5 space-y-4">
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
            O que você vai ter
          </p>
          <div className="space-y-3">
            <ChecklistItem label="Organização com slug personalizado" />
            <ChecklistItem label="Equipe com controle de permissões (RBAC)" />
            <ChecklistItem label="Projetos e tarefas colaborativas" />
            <ChecklistItem label="Audit log de todas as ações" />
            <ChecklistItem label="Autenticação 2FA (em breve)" />
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <Building2 className="size-5 text-white/70 mx-auto mb-1" />
            <p className="text-xs text-white/70">Multi-tenant</p>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <Users className="size-5 text-white/70 mx-auto mb-1" />
            <p className="text-xs text-white/70">Colaboração</p>
          </div>
        </div>
      </div>

      {/* Footer quote */}
      <blockquote className="border-l-2 border-white/30 pl-4">
        <p className="text-sm text-white/80 italic">
          &ldquo;Centralizar equipes e projetos nunca foi tão simples.&rdquo;
        </p>
        <p className="text-xs text-white/40 mt-1">— Depoimento ilustrativo</p>
      </blockquote>
    </div>
  );
}

export function AuthPanel({ variant }: AuthPanelProps) {
  return (
    <div className="h-full bg-gradient-to-br from-primary via-primary/90 to-indigo-800">
      {variant === "login" ? <LoginPanel /> : <SignupPanel />}
    </div>
  );
}
