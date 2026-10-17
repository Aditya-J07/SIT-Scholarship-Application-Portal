"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface TurnstileRef {
  reset: () => void;
}

export interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: (error?: string) => void;
  onExpire?: () => void;
  siteKey?: string;
  className?: string;
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (errorCode?: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(function Turnstile(
  { onVerify, onError, onExpire, siteKey: propSiteKey, className = "", theme = "light" },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const siteKey =
    propSiteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return;

    try {
      // Clean up previous widget if exists in this container
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore removal errors
        }
        widgetIdRef.current = null;
      }

      setLoadError(null);
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          onVerify(token);
        },
        "error-callback": (errorCode?: string) => {
          const msg = errorCode
            ? `Security verification error (${errorCode}). Please retry.`
            : "Security verification failed to load. Please retry.";
          setLoadError(msg);
          onError?.(msg);
        },
        "expired-callback": () => {
          onExpire?.();
        },
        theme,
      });

      widgetIdRef.current = widgetId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to render security verification widget";
      setLoadError(msg);
      onError?.(msg);
    }
  }, [siteKey, onVerify, onError, onExpire, theme]);

  const loadScriptAndRender = useCallback(() => {
    if (!siteKey) return;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Check if script element already exists
    let script = document.querySelector<HTMLScriptElement>(
      `script[src*="challenges.cloudflare.com/turnstile"]`
    );

    if (!script) {
      script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const onLoad = () => {
      // Give Turnstile runtime a brief moment to initialize
      if (window.turnstile) {
        renderWidget();
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 100);
        setTimeout(() => clearInterval(interval), 5000);
      }
    };

    const onError = () => {
      setLoadError(
        "Failed to load Cloudflare security verification. Please check your connection or ad-blocker."
      );
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);

    // Watchdog timeout: if script doesn't initialize within 8 seconds
    const timeout = setTimeout(() => {
      if (!window.turnstile && !widgetIdRef.current) {
        setLoadError(
          "Security verification service timed out. Please check your connection or ad-blocker and retry."
        );
      }
    }, 8000);

    return () => {
      clearTimeout(timeout);
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };
  }, [siteKey, renderWidget]);

  useEffect(() => {
    const cleanup = loadScriptAndRender();
    return () => {
      cleanup?.();
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore on unmount
        }
        widgetIdRef.current = null;
      }
    };
  }, [loadScriptAndRender]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          renderWidget();
        }
      }
    },
  }));

  // Handle missing key
  if (!siteKey) {
    if (process.env.NODE_ENV !== "production") {
      return (
        <div className={`p-2.5 bg-amber-50 border border-dashed border-amber-300 text-amber-900 text-xs rounded ${className}`}>
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Dev Notice: Turnstile CAPTCHA disabled</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5">
            <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px]">NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> is not configured. Validation skipped in development.
          </p>
        </div>
      );
    }

    return (
      <div className={`p-2.5 bg-red-50 border border-red-300 text-red-800 text-xs rounded ${className}`} role="alert">
        <div className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>Security verification is misconfigured</span>
        </div>
        <p className="text-[11px] text-red-700 mt-0.5">
          Please contact the portal administrator.
        </p>
      </div>
    );
  }

  return (
    <div className={`turnstile-wrapper my-2 ${className}`}>
      {loadError && (
        <div className="p-3 bg-red-50 border border-red-300 rounded text-red-800 text-xs mb-2 flex items-start justify-between gap-2" role="alert">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Security Verification Required</p>
              <p className="text-[11px] text-red-700 mt-0.5">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              loadScriptAndRender();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-red-300 text-red-700 hover:bg-red-100 rounded text-xs font-semibold shrink-0 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="min-h-[65px] flex items-center justify-center"
      />
    </div>
  );
});
