"use client"

import Link from "next/link"
import {
  CalendarClockIcon,
  CheckIcon,
  ChevronRightIcon,
  InfoIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { ProductList } from "@/lib/api"
import { formatQty } from "@/lib/format"

const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"

/**
 * What to reorder now. Each product shows how far it is below its reorder level (a bar and
 * "Need 8 more"), and links to its page. The footer holds two quiet facts: out-of-stock
 * products that have no level, and expiring batches (a zero is one muted line, not a card).
 */
export function RestockCard({
  restock,
  expiring,
  onShowAll,
  onShowExpiring,
  onShowOutOfStock,
  className,
}: {
  restock: ProductList["restock"]
  expiring: number
  onShowAll: () => void
  onShowExpiring: () => void
  onShowOutOfStock: () => void
  className?: string
}) {
  const hidden = restock.count - restock.items.length
  return (
    <section
      className={cn("flex flex-col rounded-xl border bg-card", className)}
    >
      <button
        type="button"
        onClick={onShowAll}
        disabled={restock.count === 0}
        className={cn(
          "flex items-center justify-between gap-3 rounded-t-xl px-5 py-4 text-left enabled:hover:bg-muted/40",
          FOCUS
        )}
      >
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
          Needs restocking
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
              restock.count > 0
                ? "bg-warning/15 text-warning"
                : "bg-muted text-muted-foreground"
            )}
          >
            {restock.count}
          </span>
        </h2>
        {restock.count > 0 && (
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        )}
      </button>

      <div className="flex flex-1 flex-col justify-center border-t">
        {restock.count === 0 ? (
          <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
            <CheckIcon className="size-4 text-success" />
            Every product with a reorder level is above it.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {restock.items.map((item) => {
              const missing = Math.max(item.reorder_level - item.on_hand, 0)
              const fill = Math.min(
                100,
                (Math.max(item.on_hand, 0) / item.reorder_level) * 100
              )
              return (
                <li key={item.item_code}>
                  <Link
                    href={`/products/${encodeURIComponent(item.item_code)}`}
                    className="flex flex-col gap-2 px-5 py-3 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
                  >
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium">
                        {item.item_name}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span
                          className={cn(
                            "font-semibold",
                            item.on_hand <= 0 && "text-destructive"
                          )}
                        >
                          {formatQty(item.on_hand)}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          of {formatQty(item.reorder_level)}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span
                        role="img"
                        aria-label={`${formatQty(item.on_hand)} of ${formatQty(item.reorder_level)}`}
                        className="h-1.5 flex-1 rounded-full bg-muted"
                      >
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            item.on_hand <= 0 ? "bg-destructive" : "bg-warning"
                          )}
                          style={{ width: `${Math.max(fill, 3)}%` }}
                        />
                      </span>
                      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                        Need {formatQty(missing)} more
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
            {hidden > 0 && (
              <li className="px-5 py-2 text-xs text-muted-foreground">
                + {hidden} more
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-b-xl border-t bg-muted/40 px-5 py-3.5 text-sm">
        {restock.out_without_level > 0 && (
          <button
            type="button"
            onClick={onShowOutOfStock}
            className={cn(
              "flex w-fit items-center gap-2 rounded-md text-left hover:underline",
              FOCUS
            )}
          >
            <InfoIcon className="size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-medium">
                {restock.out_without_level} out of stock
              </span>
              <span className="text-muted-foreground">
                , no reorder level set
              </span>
            </span>
          </button>
        )}
        {expiring > 0 ? (
          <button
            type="button"
            onClick={onShowExpiring}
            className={cn(
              "flex w-fit items-center gap-2 rounded-md font-medium text-destructive hover:underline",
              FOCUS
            )}
          >
            <CalendarClockIcon className="size-4 shrink-0" />
            {expiring} {expiring === 1 ? "product has" : "products have"}{" "}
            batches expiring within 90 days
          </button>
        ) : (
          <p className="flex items-center gap-2 text-muted-foreground">
            <CheckIcon className="size-4 shrink-0 text-success" />
            No batches expiring within 90 days
          </p>
        )}
      </div>
    </section>
  )
}
