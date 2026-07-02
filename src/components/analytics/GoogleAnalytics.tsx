import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const GA_ID = (import.meta as any).env?.VITE_GA4_ID as string | undefined;

/**
 * GA4 loader + SPA page_view tracker.
 * Renders nothing when VITE_GA4_ID is unset.
 */
export function GoogleAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!GA_ID || typeof window === "undefined") return;
    if ((window as any).__ga4Loaded) return;
    (window as any).__ga4Loaded = true;

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: unknown[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_ID, { send_page_view: false });
  }, []);

  useEffect(() => {
    if (!GA_ID || typeof window === "undefined" || !(window as any).gtag) return;
    (window as any).gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
