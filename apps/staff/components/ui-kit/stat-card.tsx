import { cn } from "@workspace/ui/lib/utils"

const ICON_TONES = {
  1: "text-chart-1",
  2: "text-chart-2",
  3: "text-chart-3",
  4: "text-chart-4",
  5: "text-chart-5",
} as const

/**
 * One number with its meaning: icon beside the label, the value, a short caption and an
 * optional visual (bar, gauge). With `onClick` the card becomes a shortcut, e.g. a filter.
 */
export function StatCard({
  icon: Icon,
  tone = 1,
  label,
  value,
  caption,
  emphasis,
  visual,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone?: keyof typeof ICON_TONES
  label: string
  value: React.ReactNode
  caption?: React.ReactNode
  emphasis?: "warning" | "destructive"
  visual?: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  const Root = onClick ? "button" : "div"
  return (
    <Root
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card px-5 py-4 text-left",
        onClick &&
          "cursor-pointer transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
        className
      )}
    >
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={cn("size-4", ICON_TONES[tone])} />
        {label}
      </span>
      <span
        className={cn(
          "truncate font-heading text-2xl font-semibold tracking-tight tabular-nums",
          emphasis === "warning" && "text-warning",
          emphasis === "destructive" && "text-destructive"
        )}
      >
        {value}
      </span>
      {visual}
      {caption && (
        <span className="text-sm text-muted-foreground">{caption}</span>
      )}
    </Root>
  )
}
