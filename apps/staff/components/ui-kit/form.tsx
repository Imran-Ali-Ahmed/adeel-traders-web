"use client"

import * as React from "react"

import { FieldDescription, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

/** Field label with a quiet red star for required fields. */
export function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <FieldLabel htmlFor={htmlFor}>
      {children}
      <span aria-hidden className="text-destructive">
        *
      </span>
      <span className="sr-only">(required)</span>
    </FieldLabel>
  )
}

/** Under a field: the error after a save attempt, otherwise the hint. */
export function FieldHint({
  error,
  hint,
}: {
  error?: string
  hint?: React.ReactNode
}) {
  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    )
  }
  return hint ? <FieldDescription>{hint}</FieldDescription> : null
}

/**
 * The validation pattern for every dialog: the save button is never silently greyed out.
 * Clicking it with something missing shows what is missing and moves focus to that field.
 * `errors` maps a field's element id to its message (undefined when the field is fine).
 */
export function useFormCheck(errors: Record<string, string | undefined>) {
  const [tried, setTried] = React.useState(false)
  const firstBad = Object.keys(errors).find((id) => errors[id])
  return {
    /** Message to show for a field (only after a save attempt). */
    error: (id: string) => (tried ? errors[id] : undefined),
    /** For `aria-invalid` / `data-invalid`. */
    invalid: (id: string) => (tried && errors[id] ? true : undefined),
    reset: () => setTried(false),
    submit: (event: React.FormEvent, save: () => void) => {
      event.preventDefault()
      if (firstBad) {
        setTried(true)
        document.getElementById(firstBad)?.focus()
        return
      }
      save()
    },
  }
}

/** A money amount: "Rs" inside the box, "Set price" when empty (never 0). */
export function MoneyInput({
  id,
  value,
  onChange,
  invalid,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center rounded-lg border border-input bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1",
        invalid && "border-destructive",
        className
      )}
    >
      <span className="pl-2.5 text-sm text-muted-foreground">Rs</span>
      <Input
        id={id}
        inputMode="decimal"
        placeholder="Set price"
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 border-0 bg-transparent px-2 text-right font-medium tabular-nums shadow-none placeholder:font-normal focus-visible:ring-0 dark:bg-transparent"
        {...props}
      />
    </div>
  )
}

/** True when the text is empty or a number that is zero or more. */
export function isAmount(text: string) {
  return (
    text.trim() === "" || (!Number.isNaN(Number(text)) && Number(text) >= 0)
  )
}
