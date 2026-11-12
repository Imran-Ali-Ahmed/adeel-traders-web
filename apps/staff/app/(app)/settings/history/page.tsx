"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useInfiniteQuery } from "@tanstack/react-query"
import { ChevronDownIcon, HistoryIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { AREA_LOOK, areaLabel, recordHref } from "@/components/history/areas"
import { PersonAvatar } from "@/components/roles/role-parts"
import { ErrorState } from "@/components/ui-kit/error-state"
import {
  ChoiceFilter,
  FilterBar,
  useUrlFilters,
} from "@/components/ui-kit/filter-bar"
import { ChangeLine, lookOf } from "@/components/ui-kit/history-panel"
import { IconTile } from "@/components/ui-kit/icon-tile"
import { api, type HistoryEvent } from "@/lib/api"
import { formatDate } from "@/lib/format"

const KEYS = [
  "search",
  "user",
  "area",
  "from_date",
  "to_date",
  "include_system",
] as const

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)

/** The sentence after the person's name: "deleted the address X", "changed Phone No on the company X". */
function Sentence({ e }: { e: HistoryEvent }) {
  const href =
    e.kind === "deleted" ? null : recordHref(e.link.doctype, e.link.name)
  const record = href ? (
    <Link
      href={href}
      className="rounded-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      {e.title}
    </Link>
  ) : (
    <span className="font-medium">{e.title}</span>
  )
  const the = e.type_word ? `the ${e.type_word} ` : ""
  const muted = "text-muted-foreground"

  if (e.kind === "login_failed")
    return (
      <span className={muted}>
        had{" "}
        {e.summary === "Failed login"
          ? "a failed login"
          : `${lower(e.summary)}`}
      </span>
    )
  if (e.kind === "login" || e.kind === "logout")
    return <span className={muted}>{lower(e.summary)}</span>
  if (["created", "deleted", "submitted", "cancelled"].includes(e.kind)) {
    // a price's own sentence ("Set the Wholesale price: Rs 450") needs no extra type word
    if (!e.type_word && e.kind === "created")
      return (
        <>
          <span className={muted}>{lower(e.summary)}</span>
          <span className={muted}>·</span>
          {record}
        </>
      )
    return (
      <>
        <span className={muted}>{lower(e.summary)}</span>
        <span className={muted}>{the}</span>
        {record}
      </>
    )
  }
  if (e.kind === "changed")
    return (
      <>
        <span className={muted}>{lower(e.summary)} on</span>
        <span className={muted}>{the}</span>
        {record}
      </>
    )
  // notes written by the app ("Works at: …"): the sentence is complete, the record follows
  return (
    <>
      <span className={muted}>{lower(e.summary)}</span>
      <span className={muted}>·</span>
      {record}
    </>
  )
}

function Row({ e }: { e: HistoryEvent }) {
  const [open, setOpen] = React.useState(false)
  // a failed login keeps its red warning icon instead of the area's
  const area = e.kind === "login_failed" ? undefined : AREA_LOOK[e.area]
  const look = lookOf(e.kind)
  return (
    <li className="grid grid-cols-[3rem_auto_minmax(0,1fr)] gap-x-3 px-4 py-3 md:px-5">
      <time
        dateTime={e.at}
        className="pt-1.5 text-sm text-muted-foreground tabular-nums"
      >
        {e.at.slice(11, 16)}
      </time>
      {area ? (
        <IconTile icon={area.icon} tone={area.tone} />
      ) : (
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            look.tone
          )}
        >
          <look.icon className="size-4" />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
          <PersonAvatar user={e.user} name={e.user_name} />
          <span className="font-medium">{e.user_name}</span>
          <Sentence e={e} />
          {e.area && (
            <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {areaLabel(e.area)}
            </span>
          )}
        </p>
        {e.changes.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {e.changes.slice(0, 4).map((c, i) => (
              <ChangeLine key={i} change={c} />
            ))}
            {e.changes.length > 4 && (
              <li className="text-xs text-muted-foreground">
                and {e.changes.length - 4} more
              </li>
            )}
          </ul>
        )}
        {e.detail && (
          <>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <ChevronDownIcon
                className={cn(
                  "size-3 transition-transform",
                  open && "rotate-180"
                )}
              />
              Details
            </button>
            {open && (
              <span className="text-xs text-muted-foreground">{e.detail}</span>
            )}
          </>
        )}
      </div>
    </li>
  )
}

/** "Today", "Yesterday", or the date. */
function dayName(day: string) {
  const d = (n: number) => {
    const t = new Date()
    t.setDate(t.getDate() - n)
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
  }
  if (day === d(0)) return "Today"
  if (day === d(1)) return "Yesterday"
  return formatDate(day)
}

function ChangeHistory() {
  const [f, setF] = useUrlFilters(KEYS)
  const log = useInfiniteQuery({
    queryKey: ["history", "audit", f],
    queryFn: ({ pageParam }) =>
      api.auditLog({ ...f, start: pageParam, page_length: 50 }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.has_more
        ? pages.reduce((n, p) => n + p.events.length, 0)
        : undefined,
  })
  const first = log.data?.pages[0]
  const events = log.data?.pages.flatMap((p) => p.events) ?? []
  const filtered = Object.entries(f).some(
    ([k, v]) => v && k !== "include_system"
  )
  const clearAll = () =>
    setF({ search: "", user: "", area: "", from_date: "", to_date: "" })

  // Day headings: the rows inside a day show only the time.
  const days: { day: string; rows: HistoryEvent[] }[] = []
  for (const e of events) {
    const day = e.at.slice(0, 10)
    const last = days[days.length - 1]
    if (last?.day === day) last.rows.push(e)
    else days.push({ day, rows: [e] })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-start gap-3">
        <IconTile icon={HistoryIcon} tone="cobalt" size="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Change history
          </h1>
          <p className="text-muted-foreground">
            Who changed what in the business, and when. Every save is recorded;
            nothing here can be edited. Logins are under Security.
          </p>
        </div>
      </div>

      {log.error && !first ? (
        <ErrorState
          title="Couldn't load the change history"
          message={log.error.message}
          onRetry={() => log.refetch()}
          retrying={log.isFetching}
        />
      ) : (
        <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
          <FilterBar
            show={["search", "from_date"]}
            values={f}
            onChange={setF}
            options={{}}
            anyTime
            searchPlaceholder="Search changes"
            extra={{
              active: !!f.user || !!f.area,
              clearPatch: { user: "", area: "" },
              node: (
                <>
                  <ChoiceFilter
                    label="Person"
                    allLabel="Everyone"
                    value={f.user}
                    options={first?.people.map((p) => p.name) ?? []}
                    labels={Object.fromEntries(
                      (first?.people ?? []).map((p) => [
                        p.name,
                        p.full_name || p.name,
                      ])
                    )}
                    onChange={(user) => setF({ user })}
                  />
                  <ChoiceFilter
                    label="Area"
                    allLabel="All areas"
                    value={f.area}
                    options={first?.areas ?? []}
                    labels={{ Logins: "Security" }}
                    onChange={(area) => setF({ area })}
                  />
                </>
              ),
            }}
            toggle={{
              label: "Show system changes",
              checked: f.include_system === "1",
              onChange: (on) => setF({ include_system: on ? "1" : "" }),
            }}
          />

          {log.isLoading ? (
            <div className="flex flex-col gap-4 p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {filtered
                  ? "Nothing was changed with these filters."
                  : "Nothing has been changed yet."}
              </p>
              {filtered && (
                <Button variant="outline" onClick={clearAll}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            days.map(({ day, rows }) => (
              <div key={day}>
                <h2 className="sticky top-16 z-[1] border-y bg-muted/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm first:border-t-0 md:px-5">
                  {dayName(day)}
                </h2>
                <ol className="flex flex-col divide-y">
                  {rows.map((e, i) => (
                    <Row key={`${e.at}-${i}`} e={e} />
                  ))}
                </ol>
              </div>
            ))
          )}
          {log.hasNextPage && (
            <div className="border-t px-4 py-3 md:px-5">
              <Button
                variant="outline"
                onClick={() => log.fetchNextPage()}
                disabled={log.isFetchingNextPage}
              >
                {log.isFetchingNextPage && <Spinner data-icon="inline-start" />}
                Show older
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default function ChangeHistoryPage() {
  return (
    <Suspense>
      <ChangeHistory />
    </Suspense>
  )
}
