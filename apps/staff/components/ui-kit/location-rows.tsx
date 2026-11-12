import { cn } from "@workspace/ui/lib/utils"

import { formatQty, formatRs, shortWarehouse } from "@/lib/format"

type Location = {
  warehouse: string
  for_sale: boolean
  qty: number
  reserved: number
  /** Value at cost; null when the user may not see cost. */
  value?: number | null
}

/** One row per location: a thin bar for the quantity. Not-for-sale rows are tinted and tagged. */
export function LocationRows({ locations }: { locations: Location[] }) {
  const biggest = Math.max(1, ...locations.map((l) => l.qty))
  return (
    <ul className="-mx-3 flex flex-col divide-y">
      {locations.map((l) => (
        <li
          key={l.warehouse}
          className={cn(
            "flex flex-col gap-1.5 px-3 py-3",
            !l.for_sale && "bg-destructive/5"
          )}
        >
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "truncate font-medium",
                  !l.for_sale && "text-muted-foreground"
                )}
              >
                {shortWarehouse(l.warehouse)}
              </span>
              {!l.for_sale && (
                <span className="shrink-0 rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                  Not for sale
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
              {l.for_sale && l.reserved > 0 && (
                <span className="text-xs text-muted-foreground">
                  {formatQty(l.reserved)} held
                </span>
              )}
              {l.value != null && (
                <span className="text-xs text-muted-foreground">
                  {formatRs(l.value)}
                </span>
              )}
              <span className="font-semibold">{formatQty(l.qty)}</span>
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted" aria-hidden>
            <div
              className={cn(
                "h-full rounded-full",
                l.for_sale ? "bg-success" : "bg-destructive/60"
              )}
              style={{
                width: `${Math.max(l.qty > 0 ? 4 : 0, (l.qty / biggest) * 100)}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
