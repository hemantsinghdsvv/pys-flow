import { cn } from "@/lib/utils";

const BAND_COLOR: Record<string, string> = {
  GREEN: "text-emerald-500",
  YELLOW: "text-amber-500",
  RED: "text-red-500",
};

/**
 * Circular performance score gauge (0-100) coloured by traffic-light band.
 */
export function ScoreRing({
  score,
  band,
  size = 72,
  strokeWidth = 7,
  label,
  className,
}: {
  score: number;
  band: "GREEN" | "YELLOW" | "RED";
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("fill-none stroke-current transition-all", BAND_COLOR[band])}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold tabular-nums">{Math.round(score)}</span>
        {label && (
          <span className="text-[10px] text-muted-foreground">{label}</span>
        )}
      </div>
    </div>
  );
}
