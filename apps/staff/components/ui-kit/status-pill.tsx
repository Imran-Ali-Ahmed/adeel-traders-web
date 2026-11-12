import { cn } from "@workspace/ui/lib/utils"

import type { ProductDetail } from "@/lib/api"

const STATUS = {
  in_stock: {
    label: "In stock",
    className: "bg-success/10 text-success ring-success/20",
  },
  low_stock: {
    label: "Low stock",
    className: "bg-warning/12 text-warning ring-warning/25",
  },
  out_of_stock: {
    label: "Out of stock",
    className: "bg-destructive/10 text-destructive ring-destructive/20",
  },
  bundle: {
    label: "Gift set",
    className: "bg-primary/10 text-primary ring-primary/20",
  },
} as const

const PILL =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset"

/** Dot and text. The same pill is used in the list and on the product page. */
export function StatusPill({ status }: { status: ProductDetail["status"] }) {
  if (!status) return null
  const style = STATUS[status]
  return (
    <span className={cn(PILL, style.className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {style.label}
    </span>
  )
}

export function ExpiringPill() {
  return (
    <span className={cn(PILL, "bg-chart-5/10 text-chart-5 ring-chart-5/20")}>
      Expiring
    </span>
  )
}
