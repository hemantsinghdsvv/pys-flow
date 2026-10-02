import { cn } from "@/lib/utils";
import { STATUS_BADGE_STYLES } from "@/config/labels";

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        STATUS_BADGE_STYLES[status] ??
          "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
        className
      )}
    >
      {label ?? status}
    </span>
  );
}
