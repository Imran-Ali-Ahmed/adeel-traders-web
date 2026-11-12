"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import {
  ArrowDownToLineIcon,
  ArrowRightLeftIcon,
  CalendarXIcon,
  ClipboardCheckIcon,
  FileMinusIcon,
  PackagePlusIcon,
  SearchXIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { api, type StockHistoryRow } from "@/lib/api"
import { formatDate, formatQty, formatRs, shortWarehouse } from "@/lib/format"

// The movement words come from the server; this only picks an icon and a colour.
const LOOK: Record<string, { icon: LucideIcon; tone: string }> = {
  Received: { icon: ArrowDownToLineIcon, tone: "bg-success/10 text-success" },
  "Opening stock": {
    icon: PackagePlusIcon,
    tone: "bg-success/10 text-success",
  },
  Sold: { icon: ShoppingBagIcon, tone: "bg-primary/10 text-primary" },
  Moved: { icon: ArrowRightLeftIcon, tone: "bg-muted text-foreground/70" },
  Counted: { icon: ClipboardCheckIcon, tone: "bg-muted text-foreground/70" },
  Damaged: {
    icon: TriangleAlertIcon,
    tone: "bg-destructive/10 text-destructive",
  },
  Expired: { icon: CalendarXIcon, tone: "bg-destructive/10 text-destructive" },
  Lost: { icon: SearchXIcon, tone: "bg-destructive/10 text-destructive" },
  Tester: { icon: SparklesIcon, tone: "bg-chart-2/10 text-chart-2" },
  "Written off": {
    icon: FileMinusIcon,
    tone: "bg-destructive/10 text-destructive",
  },
}

function Row({ row }: { row: StockHistoryRow }) {
  const look = LOOK[row.what] ?? {
    icon: ClipboardCheckIcon,
    tone: "bg-muted text-foreground/70",
  }
  const Icon = look.icon
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          look.tone
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {row.what} · {shortWarehouse(row.location)}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {formatDate(row.date)} {row.time} · {row.document}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end tabular-nums">
        <span
          className={cn(
            "text-sm font-semibold",
            row.qty > 0 ? "text-success" : "text-destructive"
          )}
        >
          {row.qty > 0 ? "+" : "−"}
          {formatQty(Math.abs(row.qty))}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatQty(row.balance_here)} left here
          {row.value !== null ? ` · ${formatRs(Math.abs(row.value))}` : ""}
        </span>
      </div>
    </li>
  )
}

/** Every stock movement of the product, newest first (ERPNext's stock ledger). */
export function StockHistory({ itemCode }: { itemCode: string }) {
  const history = useInfiniteQuery({
    queryKey: ["stock-history", itemCode],
    queryFn: ({ pageParam }) => api.stockHistory(itemCode, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.more ? pages.reduce((n, p) => n + p.rows.length, 0) : undefined,
  })

  if (history.isLoading) return <Skeleton className="h-40 w-full rounded-lg" />
  if (history.error)
    return <p className="text-sm text-destructive">{history.error.message}</p>
  const rows = history.data?.pages.flatMap((p) => p.rows) ?? []
  if (rows.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No stock movements yet. Receiving, selling, moving and counting stock
        all show here.
      </p>
    )
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y">
        {rows.map((row, i) => (
          <Row key={`${row.document}-${row.location}-${i}`} row={row} />
        ))}
      </ul>
      {history.hasNextPage && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => history.fetchNextPage()}
          disabled={history.isFetchingNextPage}
        >
          {history.isFetchingNextPage && <Spinner data-icon="inline-start" />}
          Show older
        </Button>
      )}
    </div>
  )
}
