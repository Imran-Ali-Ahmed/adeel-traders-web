import { cn } from "@workspace/ui/lib/utils"

import { formatQty } from "@/lib/format"

/**
 * On hand against the reorder level, with a marker at the level. The headline ("Need 8 more")
 * belongs to the card; this draws the bar and one line of numbers.
 */
export function ReorderGauge({
  onHand,
  level,
  orderQty,
  action,
}: {
  onHand: number
  /** 0 or missing means no reorder level is set. */
  level: number
  orderQty: number
  /** What to do about it, e.g. a "Change level" link. */
  action?: React.ReactNode
}) {
  if (!level) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>You won't be warned before this runs out.</span>
        {action}
      </div>
    )
  }
  const low = onHand <= level
  const scale = Math.max(level * 1.5, onHand * 1.1, 1)
  const fill = Math.min(100, (Math.max(onHand, 0) / scale) * 100)
  const marker = (level / scale) * 100
  const tone =
    onHand <= 0 ? "bg-destructive" : low ? "bg-warning" : "bg-success"

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`${formatQty(onHand)} available, reorder level ${formatQty(level)}`}
        className="relative h-2 rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${fill}%` }}
        />
        <div
          aria-hidden
          className="absolute -top-1 h-4 w-0.5 rounded bg-foreground"
          style={{ left: `${marker}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground tabular-nums">
          {formatQty(onHand)} available, reorder at {formatQty(level)}
          {orderQty > 0 && <>. Usual order {formatQty(orderQty)}.</>}
        </span>
        {action}
      </div>
    </div>
  )
}
