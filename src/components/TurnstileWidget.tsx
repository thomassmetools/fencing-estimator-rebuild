import { useEffect, useId, useRef } from "react";
import { hasTurnstileSiteKey, isLocalTurnstileBypassEnabled, turnstileSiteKey } from "../lib/map-config";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => void;
      reset: (element?: HTMLElement) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
}

const scriptId = "cloudflare-turnstile-script";

export const TurnstileWidget = ({ onTokenChange }: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useId();

  useEffect(() => {
    if (isLocalTurnstileBypassEnabled) {
      onTokenChange("local-dev-bypass");
    }
  }, [onTokenChange]);

  useEffect(() => {
    if (isLocalTurnstileBypassEnabled || !hasTurnstileSiteKey || !containerRef.current) {
      return;
    }

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current || containerRef.current.dataset.rendered === "true") {
        return;
      }

      window.turnstile.render(containerRef.current, {
        sitekey: turnstileSiteKey,
        theme: "light",
        callback: (token) => onTokenChange(token),
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
      });
      containerRef.current.dataset.rendered = "true";
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.turnstile) {
        renderWidget();
      } else {
        existingScript.addEventListener("load", renderWidget, { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderWidget, { once: true });
    document.head.appendChild(script);
  }, [onTokenChange]);

  if (isLocalTurnstileBypassEnabled) {
    return <p className="helper-text">Local test mode: secure enquiry check bypassed.</p>;
  }

  if (!hasTurnstileSiteKey) {
    return null;
  }

  return <div id={widgetId} ref={containerRef} className="turnstile-frame" />;
};
