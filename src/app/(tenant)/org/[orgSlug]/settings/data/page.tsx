import { notFound } from "next/navigation";
import { requireOrgContext } from "@/server/org/require-org-context";
import { can } from "@/security/rbac";
import { DataExportImport } from "@/features/data/components/data-export-import";
import { CsvExportButton } from "@/features/data/components/csv-export-button";

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function DataSettingsPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const ctx = await requireOrgContext(orgSlug);

  const canExport = can(ctx.role, "data:export");
  const canImport = can(ctx.role, "data:import");

  // MEMBER e VIEWER não têm acesso a esta página
  if (!canExport && !canImport) notFound();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold">Exportação e Importação de Dados</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Exporte e importe projects e tasks da organização{" "}
          <span className="font-mono font-medium">{ctx.orgName}</span>.
        </p>
      </div>

      <DataExportImport
        orgSlug={orgSlug}
        canExport={canExport}
        canImport={canImport}
      />

      {canExport && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Exportar tarefas como CSV</h3>
          <p className="text-xs text-muted-foreground">
            Baixe todas as tarefas da organização em planilha. Abrível no Excel, Google Sheets, etc.
          </p>
          <CsvExportButton orgSlug={orgSlug} />
        </div>
      )}

      <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 p-4 text-sm">
        <p className="font-medium text-yellow-800 dark:text-yellow-200">Observação importante</p>
        <p className="text-yellow-700 dark:text-yellow-300 mt-1">
          Este export é funcional e inclui projects e tasks. Ele{" "}
          <strong>não substitui</strong> o backup completo do banco de dados.
          Para recuperação de desastres, use os backups do provedor de banco.
        </p>
      </div>
    </div>
  );
}
