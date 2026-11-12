"use client"

import * as React from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import {
  BanIcon,
  CircleCheckIcon,
  LogInIcon,
  LogOutIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  ShieldAlertIcon,
  StickyNoteIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { IconTile, type Tone } from "@/components/ui-kit/icon-tile"
import { api, type HistoryEvent } from "@/lib/api"
import { formatDate, timeAgo } from "@/lib/format"

// The words come from the server; this only picks an icon and a colour per kind of event.
const LOOK: Record<string, { icon: LucideIcon; tone: string }> = {
  created: { icon: PlusIcon, tone: "bg-success/10 text-success" },
  changed: { icon: PencilIcon, tone: "bg-primary/10 text-primary" },
  submitted: { icon: CircleCheckIcon, tone: "bg-success/10 text-success" },
  cancelled: { icon: BanIcon, tone: "bg-destructive/10 text-destructive" },
  deleted: { icon: Trash2Icon, tone: "bg-destructive/10 text-destructive" },
  note: { icon: StickyNoteIcon, tone: "bg-chart-3/16 text-warning-ink" },
  attachment: { icon: PaperclipIcon, tone: "bg-muted text-foreground/70" },
  login: { icon: LogInIcon, tone: "bg-muted text-foreground/70" },
  logout: { icon: LogOutIcon, tone: "bg-muted text-foreground/70" },
  login_failed: {
    icon: ShieldAlertIcon,
    tone: "bg-destructive/10 text-destructive",
  },
}

const CHANGED = { icon: PencilIcon, tone: "bg-primary/10 text-primary" }

export function lookOf(kind: string): { icon: LucideIcon; tone: string } {
  return LOOK[kind] ?? CHANGED
}

/** "Price: Rs 450 → Rs 500", with the old value struck through. */
export function ChangeLine({ change }: { change: HistoryEvent["changes"][0] }) {
  return (
    <li className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs">
      <span className="text-muted-foreground">{change.field}:</span>
      {change.action === "added" ? (
        <span className="font-medium text-success">+ {change.to}</span>
      ) : change.action === "removed" ? (
        <span className="text-destructive line-through">{change.from}</span>
      ) : (
        <>
          <span className="text-muted-foreground line-through decoration-muted-foreground/50">
            {change.from}
          </span>
          <span aria-hidden className="text-muted-foreground">
            →
          </span>
          <span className="sr-only">changed to</span>
          <span className="font-medium">{change.to}</span>
        </>
      )}
    </li>
  )
}

const SHOWN = 3

function EventRow({ event }: { event: HistoryEvent }) {
  const [open, setOpen] = React.useState(false)
  const look = lookOf(event.kind)
  const Icon = look.icon
  const changes = open ? event.changes : event.changes.slice(0, SHOWN)
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {/* the line that joins the events */}
      <span
        aria-hidden
        className="absolute top-8 bottom-0 left-4 w-px bg-border"
      />
      <span
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-lg",
          look.tone
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        <p className="text-sm">
          <span className="font-medium">{event.user_name}</span>{" "}
          <span className="text-muted-foreground">
            {event.summary.charAt(0).toLowerCase() + event.summary.slice(1)}
          </span>
        </p>
        {changes.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {changes.map((c, i) => (
              <ChangeLine key={i} change={c} />
            ))}
          </ul>
        )}
        {event.changes.length > SHOWN && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="self-start rounded-sm text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {open ? "Show less" : `Show ${event.changes.length - SHOWN} more`}
          </button>
        )}
        <time
          dateTime={event.at}
          title={`${formatDate(event.at)} ${event.at.slice(11, 16)}`}
          className="text-xs text-muted-foreground"
        >
          {timeAgo(event.at)}
        </time>
      </div>
    </li>
  )
}

/**
 * Who changed what and when, newest first (P1.5). Reads Frappe's own change records through
 * api/v1/history.py, which checks the reader may see the record and hides cost when needed.
 */
export function HistoryPanel({
  doctype,
  name,
  empty = "No changes yet.",
}: {
  doctype: string
  name: string
  empty?: string
}) {
  const history = useInfiniteQuery({
    queryKey: ["history", doctype, name],
    queryFn: ({ pageParam }) => api.history(doctype, name, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.has_more
        ? pages.reduce((n, p) => n + p.events.length, 0)
        : undefined,
  })

  if (history.isLoading)
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-md" />
          </div>
        ))}
      </div>
    )
  if (history.error)
    return <p className="text-sm text-destructive">{history.error.message}</p>
  const events = history.data?.pages.flatMap((p) => p.events) ?? []
  if (events.length === 0)
    return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col [&>li:last-child>span:first-child]:hidden">
        {events.map((e, i) => (
          <EventRow key={`${e.at}-${i}`} event={e} />
        ))}
      </ol>
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

/** The history as its own card, for pages without a section kit (person, role, company). */
export function HistoryCard({
  doctype,
  name,
  icon,
  tone,
  description = "Who changed what, and when.",
}: {
  doctype: string
  name: string
  icon: LucideIcon
  tone: Tone
  description?: string
}) {
  return (
    <section className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-center gap-2.5 border-b px-5 py-4">
        <IconTile icon={icon} tone={tone} size="sm" />
        <div className="flex min-w-0 flex-col">
          <h2 className="font-heading text-base font-semibold">
            Change history
          </h2>
          <span className="text-sm text-muted-foreground">{description}</span>
        </div>
      </header>
      <div className="p-5">
        <HistoryPanel doctype={doctype} name={name} />
      </div>
    </section>
  )
}
