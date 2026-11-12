import { cn } from "@workspace/ui/lib/utils"

/** Compact spec list: label in grey, value in black, 36px rows, no row borders. */
export function DetailList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <dl className={cn("flex flex-col text-sm", className)}>{children}</dl>
}

export function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-center justify-end gap-1.5 text-right font-medium">
        {children}
      </dd>
    </div>
  )
}

/** Small tag for a category, shade or unit conversion. */
export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
      {children}
    </span>
  )
}
