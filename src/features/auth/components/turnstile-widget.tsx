"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

interface TurnstileApi {
  render: (
    container: HTMLDivElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
    }
  ) => string;
  remove: (widgetId: string) => void;
}

interface TurnstileWindow {
  turnstile: TurnstileApi;
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileWidget({ onToken, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderedRef = useRef(false);

  function initWidget() {
    if (renderedRef.current) return;
    if (!containerRef.current) return;
    if (!SITE_KEY) return;

    const w = window as unknown as TurnstileWindow;
    if (!w.turnstile) return;

    renderedRef.current = true;
    widgetIdRef.current = w.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onToken,
      "expired-callback": onExpire,
    });
  }

  useEffect(() => {
    return () => {
      if (widgetIdRef.current) {
        const w = window as unknown as TurnstileWindow;
        if (w.turnstile) {
          w.turnstile.remove(widgetIdRef.current);
        }
        widgetIdRef.current = null;
        renderedRef.current = false;
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onLoad={initWidget}
      />
      <div ref={containerRef} className="mt-2" aria-label="Verificação anti-bot" />
    </>
  );
}
