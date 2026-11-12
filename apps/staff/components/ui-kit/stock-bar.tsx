import { cn } from "@workspace/ui/lib/utils"

import { formatQty } from "@/lib/format"

/**
 * Where the stock stands, as one bar: free to sell, held for orders, not for sale.
 * The numbers come from the server; this only draws them.
 */
export function StockBar({
  free,
  held,
  notForSale,
  className,
  showLegend = true,
}: {
  free: number
  held: number
  notForSale: number
  className?: string
  showLegend?: boolean
}) {
  const total = free + held + notForSale
  const parts = [
    {
      label: "free to sell",
      value: free,
      bar: "bg-success",
      dot: "bg-success",
    },
    {
      label: "held for orders",
      value: held,
      bar: "bg-warning",
      dot: "bg-warning",
    },
    {
      label: "not for sale",
      value: notForSale,
      bar: "bg-destructive",
      dot: "bg-destructive",
    },
  ].filter((p) => p.value > 0)
  const summary =
    parts.map((p) => `${formatQty(p.value)} ${p.label}`).join(", ") ||
    "No stock"

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="img"
        aria-label={summary}
        title={summary}
        className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        {parts.map((p) => (
          <div
            key={p.label}
            className={cn(
              "h-full first:rounded-l-full last:rounded-r-full",
              p.bar
            )}
            style={{ width: `${(p.value / total) * 100}%` }}
          />
        ))}
      </div>
      {showLegend && parts.length > 0 && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {parts.map((p) => (
            <span key={p.label} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", p.dot)} aria-hidden />
              <span>
                <span className="tabular-nums">{formatQty(p.value)}</span>{" "}
                {p.label}
              </span>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
