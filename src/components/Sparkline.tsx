type Props = {
  data: number[];
  width?: number;
  height?: number;
  color: "up" | "down" | "flat";
  className?: string;
};

export function Sparkline({ data, width = 80, height = 32, color, className }: Props) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const stroke =
    color === "up" ? "oklch(0.78 0.18 150)" : color === "down" ? "oklch(0.70 0.22 25)" : "oklch(0.72 0.04 280)";
  const fill =
    color === "up" ? "oklch(0.78 0.18 150 / 18%)" : color === "down" ? "oklch(0.70 0.22 25 / 18%)" : "transparent";
  const areaPath = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;
  const linePath = `M ${points.join(" L ")}`;
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
