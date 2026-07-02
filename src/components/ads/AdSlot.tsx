import { useEffect, useRef } from "react";

const ADSENSE_ID = (import.meta as any).env?.VITE_ADSENSE_ID as string | undefined;

/**
 * Google AdSense placeholder slot.
 * Renders a labeled placeholder when no VITE_ADSENSE_ID is configured.
 * When configured, renders the standard <ins class="adsbygoogle"> block.
 */
export function AdSlot({
  slot,
  format = "auto",
  className = "",
  label = "Advertisement",
}: {
  slot?: string;
  format?: string;
  className?: string;
  label?: string;
}) {
  const ref = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!ADSENSE_ID || !slot) return;
    try {
      // @ts-expect-error adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [slot]);

  if (!ADSENSE_ID || !slot) {
    return (
      <div
        className={
          "flex min-h-[90px] w-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-xs text-muted-foreground " +
          className
        }
      >
        {label} · Ad Slot
      </div>
    );
  }

  return (
    <ins
      ref={ref as any}
      className={"adsbygoogle block " + className}
      style={{ display: "block" }}
      data-ad-client={ADSENSE_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
