"use client"

import { cn } from "@workspace/ui/lib/utils"

/** A clear on/off switch (a button with role "switch"), used instead of an unclear icon. */
export function Switch({
  on,
  label,
  disabled,
  onChange,
}: {
  on: boolean
  /** What it does, for screen readers and the hover tip: "Switch Cash off". */
  label: string
  disabled?: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        on ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
          on ? "translate-x-[1.1rem]" : "translate-x-0.5"
        )}
      />
    </button>
  )
}
