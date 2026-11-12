"use client"

import type * as React from "react"
import { RotateCwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

/** A load failed: what went wrong (the server's words) and a way to try again. */
export function ErrorState({
  title,
  message,
  onRetry,
  retrying = false,
  className,
  children,
}: {
  title: string
  message?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
  /** Another way out, e.g. a link back to the list. */
  children?: React.ReactNode
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center",
        className
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <TriangleAlertIcon className="size-5" />
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <p className="font-medium">{title}</p>
        {message && (
          <p className="text-sm text-balance text-muted-foreground">
            {message}
          </p>
        )}
      </div>
      {(onRetry || children) && (
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry} disabled={retrying}>
              <RotateCwIcon
                data-icon="inline-start"
                className={cn(retrying && "animate-spin")}
              />
              Try again
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
