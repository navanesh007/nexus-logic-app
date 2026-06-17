import logoSrc from "@/assets/logo.png";

export function Logo({ size = 40, withText = false }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={logoSrc}
        alt="Open1 AI logo"
        width={size}
        height={size}
        className="drop-shadow-[0_0_24px_oklch(0.66_0.24_290/45%)]"
      />
      {withText && (
        <span className="text-xl font-semibold tracking-tight gradient-text">Open1 AI</span>
      )}
    </div>
  );
}