import {
  parseDeviceLabel,
  shouldUpdateLastSeen,
  LAST_SEEN_THROTTLE_MS,
  formatRelativeTime,
} from "@/server/security/session-utils";

// ---------------------------------------------------------------------------
// parseDeviceLabel
// ---------------------------------------------------------------------------

describe("parseDeviceLabel", () => {
  it("retorna fallback para null", () => {
    expect(parseDeviceLabel(null)).toBe("Dispositivo desconhecido");
  });

  it("retorna fallback para undefined", () => {
    expect(parseDeviceLabel(undefined)).toBe("Dispositivo desconhecido");
  });

  it("retorna fallback para string vazia", () => {
    expect(parseDeviceLabel("")).toBe("Dispositivo desconhecido");
  });

  it("detecta Chrome em Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(parseDeviceLabel(ua)).toBe("Chrome em Windows");
  });

  it("detecta Firefox em Linux", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0";
    expect(parseDeviceLabel(ua)).toBe("Firefox em Linux");
  });

  it("detecta Safari em macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
    expect(parseDeviceLabel(ua)).toBe("Safari em macOS");
  });

  it("detecta Edge em Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(parseDeviceLabel(ua)).toBe("Edge em Windows");
  });

  it("detecta Chrome em Android", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(parseDeviceLabel(ua)).toBe("Chrome em Android");
  });

  it("detecta Safari em iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
    expect(parseDeviceLabel(ua)).toBe("Safari em iOS");
  });
});

// ---------------------------------------------------------------------------
// shouldUpdateLastSeen
// ---------------------------------------------------------------------------

describe("shouldUpdateLastSeen", () => {
  it("retorna false quando lastSeenAt é recente (< 10 min)", () => {
    const lastSeenAt = new Date();
    const now = new Date(lastSeenAt.getTime() + 5 * 60 * 1000); // +5 min
    expect(shouldUpdateLastSeen(lastSeenAt, now)).toBe(false);
  });

  it("retorna true quando passaram exatamente 10 min", () => {
    const lastSeenAt = new Date();
    const now = new Date(lastSeenAt.getTime() + LAST_SEEN_THROTTLE_MS);
    expect(shouldUpdateLastSeen(lastSeenAt, now)).toBe(true);
  });

  it("retorna true quando passaram mais de 10 min", () => {
    const lastSeenAt = new Date();
    const now = new Date(lastSeenAt.getTime() + 60 * 60 * 1000); // +1h
    expect(shouldUpdateLastSeen(lastSeenAt, now)).toBe(true);
  });

  it("retorna false quando lastSeenAt é agora", () => {
    const now = new Date();
    expect(shouldUpdateLastSeen(now, now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

describe("formatRelativeTime", () => {
  it("retorna 'agora mesmo' para menos de 1 minuto", () => {
    const now = new Date();
    const date = new Date(now.getTime() - 30_000);
    expect(formatRelativeTime(date, now)).toBe("agora mesmo");
  });

  it("retorna minutos", () => {
    const now = new Date();
    const date = new Date(now.getTime() - 5 * 60_000);
    expect(formatRelativeTime(date, now)).toBe("há 5 minutos");
  });

  it("retorna horas", () => {
    const now = new Date();
    const date = new Date(now.getTime() - 2 * 3_600_000);
    expect(formatRelativeTime(date, now)).toBe("há 2 horas");
  });

  it("retorna 'há 1 hora' (singular)", () => {
    const now = new Date();
    const date = new Date(now.getTime() - 3_600_000);
    expect(formatRelativeTime(date, now)).toBe("há 1 hora");
  });

  it("retorna dias", () => {
    const now = new Date();
    const date = new Date(now.getTime() - 3 * 86_400_000);
    expect(formatRelativeTime(date, now)).toBe("há 3 dias");
  });
});
