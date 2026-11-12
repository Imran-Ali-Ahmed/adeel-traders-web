import { cn } from "@workspace/ui/lib/utils"

import { formatRs } from "@/lib/format"

// Colour bands for margin %. These are display thresholds, not accounting rules: confirm the
// numbers with the owner. The margin itself is always calculated on the server.
const GOOD = 35
const LOW = 25
const VERY_LOW = 10

/** Margin % with a colour band, and the profit per unit beside it in muted text. */
export function MarginPill({
  margin,
  profit,
  className,
}: {
  margin: number | null
  profit?: number | null
  className?: string
}) {
  if (margin === null) return null
  const tone =
    margin < 0 || margin < VERY_LOW
      ? "bg-destructive/10 text-destructive"
      : margin < LOW
        ? "bg-warning/12 text-warning"
        : margin >= GOOD
          ? "bg-success/10 text-success"
          : "bg-muted text-foreground/80"
  return (
    <span
      title="Gross margin: (price − cost) ÷ price"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs tabular-nums",
        className
      )}
    >
      <span className={cn("rounded-md px-1.5 py-0.5 font-medium", tone)}>
        {margin < 0 ? "Loss " : ""}
        {margin}%
      </span>
      {profit != null && (
        <span className="whitespace-nowrap text-muted-foreground">
          {profit < 0 ? "−" : "+"}
          {formatRs(Math.abs(profit))} profit
        </span>
      )}
    </span>
  )
}
