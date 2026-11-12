import { cn } from "@workspace/ui/lib/utils"

import type { ProductDetail } from "@/lib/api"
import { formatQty } from "@/lib/format"

type Part = NonNullable<ProductDetail["bundle"]>["parts"][number]

/** Parts of a gift set, each with a bar for how many sets it alone could make. */
export function BottleneckList({ parts }: { parts: Part[] }) {
  const most = Math.max(1, ...parts.map((p) => p.enough_for))
  return (
    <ul className="-mx-3 flex flex-col divide-y">
      {parts.map((p) => (
        <li
          key={p.item_code}
          className={cn(
            "flex flex-col gap-2 px-4 py-3",
            p.limiting && "bg-warning/8"
          )}
        >
          <div className="flex items-start justify-between gap-3 text-sm">
            <div className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium">{p.item_name}</span>
                {p.limiting && (
                  <span className="shrink-0 rounded-md bg-warning/15 px-1.5 py-0.5 text-xs font-medium text-warning">
                    Limiting part
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {p.item_code} · {formatQty(p.qty_per_set)} per set
              </span>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <div className="font-semibold">
                {formatQty(p.enough_for)} sets
              </div>
              <div className="text-xs text-muted-foreground">
                {formatQty(p.in_stock)} in stock
              </div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-muted" aria-hidden>
            <div
              className={cn(
                "h-full rounded-full",
                p.enough_for === 0
                  ? "bg-destructive"
                  : p.limiting
                    ? "bg-warning"
                    : "bg-success"
              )}
              style={{
                width: `${Math.max(p.enough_for > 0 ? 3 : 0, (p.enough_for / most) * 100)}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
