import { cn } from "@workspace/ui/lib/utils"

import type { StockCountStatus } from "@/lib/api"

const LOOK: Record<StockCountStatus, string> = {
  Draft: "bg-warning/12 text-warning ring-warning/25",
  Submitted: "bg-success/10 text-success ring-success/20",
  Cancelled: "bg-muted text-muted-foreground ring-border",
}

const WORDS: Record<StockCountStatus, string> = {
  Draft: "Counting",
  Submitted: "Posted",
  Cancelled: "Cancelled",
}

export function CountStatus({ status }: { status: StockCountStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        LOOK[status]
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {WORDS[status]}
    </span>
  )
}
