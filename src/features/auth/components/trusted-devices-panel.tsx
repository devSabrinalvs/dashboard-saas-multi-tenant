"use client";

import { useCallback, useEffect, useState } from "react";
import { Smartphone, Loader2, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/server/security/session-utils";

interface TrustedDeviceItem {
  id: string;
  deviceLabel: string;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
}

export function TrustedDevicesPanel() {
  const [devices, setDevices] = useState<TrustedDeviceItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/auth/trusted-devices");
      if (!res.ok) throw new Error("fetch failed");
      setDevices(await res.json() as TrustedDeviceItem[]);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { void fetchDevices(); }, [fetchDevices]);

  async function revokeDevice(id: string) {
    setRevoking(id);
    try {
      const res = await fetch(`/api/auth/trusted-devices/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } finally {
      setRevoking(null);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="size-4 animate-spin" />
        Carregando dispositivos…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive py-2">
        <ShieldAlert className="size-4" />
        Não foi possível carregar os dispositivos.
        <button onClick={fetchDevices} className="underline hover:no-underline ml-1 cursor-pointer">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Nenhum dispositivo de confiança configurado.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border overflow-hidden">
      {devices.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-card">
          <div className="flex items-start gap-3 min-w-0">
            <Smartphone className="size-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 space-y-0.5">
              <span className="text-sm font-medium truncate block">{d.deviceLabel}</span>
              <p className="text-xs text-muted-foreground">
                {d.ip ? `${d.ip} · ` : ""}
                {d.lastUsedAt
                  ? `Último uso ${formatRelativeTime(new Date(d.lastUsedAt))}`
                  : `Adicionado em ${new Date(d.createdAt).toLocaleDateString("pt-BR")}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Expira em {new Date(d.expiresAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={revoking === d.id}
            onClick={() => revokeDevice(d.id)}
            aria-label="Revogar dispositivo de confiança"
          >
            {revoking === d.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
            Revogar
          </Button>
        </li>
      ))}
    </ul>
  );
}
