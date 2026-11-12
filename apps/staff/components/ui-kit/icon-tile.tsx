import type { LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Every module has its own colour, used for its icon everywhere (sidebar, tables, rows, cards),
 * so people find things by colour as well as by name. Colour here is identity, not a warning:
 * amber/red text still means "careful" (see DESIGN.md).
 */
export const TONES = {
  cobalt: { text: "text-chart-1", tile: "bg-chart-1/12 text-chart-1" },
  violet: { text: "text-chart-2", tile: "bg-chart-2/14 text-chart-2" },
  amber: { text: "text-chart-3", tile: "bg-chart-3/16 text-warning-ink" },
  emerald: { text: "text-chart-4", tile: "bg-chart-4/14 text-chart-4" },
  rose: { text: "text-chart-5", tile: "bg-chart-5/12 text-chart-5" },
  teal: { text: "text-chart-6", tile: "bg-chart-6/14 text-chart-6" },
  fuchsia: { text: "text-chart-7", tile: "bg-chart-7/12 text-chart-7" },
  lime: { text: "text-chart-8", tile: "bg-chart-8/14 text-chart-8" },
} as const
export type Tone = keyof typeof TONES

/** An icon on a soft tile of its module colour. */
export function IconTile({
  icon: Icon,
  tone,
  size = "md",
  className,
}: {
  icon: LucideIcon
  tone: Tone
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg",
        TONES[tone].tile,
        size === "sm" && "size-6 rounded-md [&>svg]:size-3.5",
        size === "md" && "size-8 [&>svg]:size-4",
        size === "lg" && "size-10 [&>svg]:size-5",
        className
      )}
    >
      <Icon />
    </span>
  )
}
