import { cn } from "@workspace/ui/lib/utils"

import { formatRs } from "@/lib/format"

/** A channel price with its margin underneath (margin only for roles allowed to see cost). */
export function PriceWithMargin({
  rate,
  margin,
  align = "end",
}: {
  rate: number | null
  margin: number | null
  align?: "start" | "end"
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        align === "end" ? "items-end" : "items-start"
      )}
    >
      <span
        className={cn(
          "tabular-nums",
          rate === null && "text-muted-foreground/60"
        )}
      >
        {rate === null ? "—" : formatRs(rate)}
      </span>
      {margin !== null && (
        <span
          className={cn(
            "text-xs tabular-nums",
            margin < 0
              ? "font-medium text-destructive"
              : margin < 10
                ? "font-medium text-warning"
                : "text-muted-foreground"
          )}
        >
          {margin < 0 ? "Loss " : ""}
          {margin}%
        </span>
      )}
    </div>
  )
}
