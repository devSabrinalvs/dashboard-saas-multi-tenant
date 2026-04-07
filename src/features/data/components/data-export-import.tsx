"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EXPORT_LIMITS } from "@/schemas/data-export";

interface Props {
  orgSlug: string;
  canExport: boolean;
  canImport: boolean;
}

interface ImportResult {
  dryRun: boolean;
  createdProjects: number;
  createdTasks: number;
  skippedTasks: number;
  warnings: string[];
}

export function DataExportImport({ orgSlug, canExport, canImport }: Props) {
  // ── Export state ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // ── Import state ──────────────────────────────────────────────────────────
  const [importJson, setImportJson] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ── Export handler ────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch(`/api/org/${orgSlug}/export`);
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        setExportError(json.error ?? "Erro ao exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `export-${orgSlug}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Erro de rede ao exportar");
    } finally {
      setExporting(false);
    }
  }

  // ── Import handler ────────────────────────────────────────────────────────
  async function handleImport() {
    setImportError(null);
    setImportResult(null);

    if (!importJson.trim()) {
      setImportError("Cole o JSON do export antes de importar.");
      return;
    }

    // Verificar tamanho do lado do cliente (early validation)
    if (new TextEncoder().encode(importJson).length > EXPORT_LIMITS.MAX_PAYLOAD_BYTES) {
      setImportError(`Payload excede ${EXPORT_LIMITS.MAX_PAYLOAD_BYTES / (1024 * 1024)} MB.`);
      return;
    }

    // Validar JSON antes de enviar
    try {
      JSON.parse(importJson);
    } catch {
      setImportError("JSON inválido. Verifique o conteúdo colado.");
      return;
    }

    setImporting(true);
    try {
      const url = `/api/org/${orgSlug}/import${dryRun ? "?dryRun=true" : ""}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: importJson,
      });
      const json = await res.json() as ImportResult & { error?: string; details?: unknown };
      if (!res.ok) {
        setImportError(json.error ?? "Erro ao importar");
        return;
      }
      setImportResult(json);
    } catch {
      setImportError("Erro de rede ao importar");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Export */}
      {canExport && (
        <section className="space-y-3">
          <div>
            <h3 className="font-semibold">Exportar dados</h3>
            <p className="text-sm text-muted-foreground">
              Baixa um arquivo JSON com todos os projects e tasks da organização.
              Formato v1 — compatível com o import abaixo.
            </p>
          </div>

          {exportError && (
            <p className="text-sm text-destructive">{exportError}</p>
          )}

          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="outline"
          >
            {exporting ? "Exportando..." : "Download export (JSON)"}
          </Button>
        </section>
      )}

      {/* Import */}
      {canImport && (
        <section className="space-y-4 border-t pt-6">
          <div>
            <h3 className="font-semibold">Importar dados</h3>
            <p className="text-sm text-muted-foreground">
              Cole o JSON de um export v1. O import é sempre{" "}
              <strong>append</strong> — não sobrescreve dados existentes.
              Limite: {EXPORT_LIMITS.MAX_PROJECTS} projects, {EXPORT_LIMITS.MAX_TASKS} tasks,{" "}
              {EXPORT_LIMITS.MAX_PAYLOAD_BYTES / (1024 * 1024)} MB.
            </p>
          </div>

          <textarea
            value={importJson}
            onChange={(e) => {
              setImportJson(e.target.value);
              setImportResult(null);
              setImportError(null);
            }}
            placeholder='Cole aqui o JSON do export ({"version": 1, ...})'
            rows={10}
            className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dryRun"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="size-4"
            />
            <label htmlFor="dryRun" className="text-sm">
              Dry run — validar sem gravar (recomendado antes do import real)
            </label>
          </div>

          {importError && (
            <p className="text-sm text-destructive">{importError}</p>
          )}

          {importResult && (
            <div className="rounded-md border p-4 space-y-2 text-sm">
              <p className="font-medium">
                {importResult.dryRun ? "Resultado do dry run:" : "Import concluído:"}
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  {importResult.dryRun ? "Seriam criados" : "Criados"}{" "}
                  <strong>{importResult.createdProjects}</strong> projects
                </li>
                <li>
                  {importResult.dryRun ? "Seriam criadas" : "Criadas"}{" "}
                  <strong>{importResult.createdTasks}</strong> tasks
                </li>
                {importResult.skippedTasks > 0 && (
                  <li className="text-yellow-600 dark:text-yellow-400">
                    {importResult.skippedTasks} tasks ignoradas (projectExternalId inválido)
                  </li>
                )}
              </ul>
              {importResult.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="font-medium text-yellow-600 dark:text-yellow-400">Warnings:</p>
                  {importResult.warnings.map((w, i) => (
                    <p key={i} className="text-yellow-600 dark:text-yellow-400 text-xs">
                      {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={importing || !importJson.trim()}
            variant={dryRun ? "outline" : "default"}
          >
            {importing
              ? "Processando..."
              : dryRun
              ? "Validar (dry run)"
              : "Importar dados"}
          </Button>
        </section>
      )}
    </div>
  );
}
