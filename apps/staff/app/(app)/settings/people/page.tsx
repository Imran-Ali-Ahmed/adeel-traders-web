"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronRightIcon,
  KeyRoundIcon,
  UserCheckIcon,
  UserPlusIcon,
  UserXIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { AddPersonDialog } from "@/components/people/add-person-dialog"
import {
  BranchLabel,
  PersonStatus,
  RoleChips,
} from "@/components/people/people-parts"
import { PersonAvatar } from "@/components/roles/role-parts"
import { ErrorState } from "@/components/ui-kit/error-state"
import { ExportButton } from "@/components/ui-kit/export-button"
import { IconTile, type Tone } from "@/components/ui-kit/icon-tile"
import { api, type Person } from "@/lib/api"
import { timeAgo } from "@/lib/format"

type Filter = "active" | "disabled" | "temporary"

/** The three facts double as filters for the list below. */
const FILTERS: Record<
  Filter,
  {
    icon: LucideIcon
    tone: Tone
    label: string
    short: string
    empty: string
    match: (p: Person) => boolean
  }
> = {
  active: {
    icon: UserCheckIcon,
    tone: "emerald",
    label: "Active",
    short: "Active",
    empty: "Nobody can log in right now.",
    match: (p) => p.enabled,
  },
  disabled: {
    icon: UserXIcon,
    tone: "rose",
    label: "Disabled",
    short: "Disabled",
    empty: "Nobody is disabled.",
    match: (p) => !p.enabled,
  },
  temporary: {
    icon: KeyRoundIcon,
    tone: "amber",
    label: "Still on a temporary password",
    short: "Temporary password",
    empty: "Everyone has chosen their own password.",
    match: (p) => p.must_change_password,
  },
}

function FactFilter({
  filter,
  value,
  on,
  onClick,
}: {
  filter: Filter
  value: number
  on: boolean
  onClick: () => void
}) {
  const f = FILTERS[filter]
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      title={on ? "Show everyone" : `Show only: ${f.label.toLowerCase()}`}
      className={cn(
        "flex cursor-pointer flex-col items-start gap-2 px-3 py-3 text-left transition-colors outline-none first:rounded-l-xl last:rounded-r-xl hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:flex-row sm:items-center sm:gap-3 sm:px-5 sm:py-4",
        on && "bg-muted/70 ring-1 ring-foreground/15 ring-inset"
      )}
    >
      <IconTile icon={f.icon} tone={f.tone} />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "font-heading text-2xl font-semibold tabular-nums",
            value === 0 && "text-muted-foreground"
          )}
        >
          {value}
        </span>
        <span className="text-xs text-muted-foreground sm:hidden">
          {f.short}
        </span>
        <span className="text-sm text-muted-foreground max-sm:hidden">
          {f.label}
        </span>
      </span>
    </button>
  )
}

/** "Temporary" next to the status, when they have not chosen their own password yet. */
function TemporaryTag() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-warning-ink"
      title="Still on the temporary password"
    >
      <KeyRoundIcon className="size-3" />
      Temporary
    </span>
  )
}

function YouTag() {
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
      You
    </span>
  )
}

export default function PeoplePage() {
  const router = useRouter()
  const people = useQuery({ queryKey: ["people"], queryFn: api.people })
  const [adding, setAdding] = React.useState(false)
  const [filter, setFilter] = React.useState<Filter | null>(null)
  const data = people.data
  const open = (p: Person) => `/settings/people/${encodeURIComponent(p.user)}`
  const rows = data
    ? filter
      ? data.people.filter(FILTERS[filter].match)
      : data.people
    : []
  const counts: Record<Filter, number> = {
    active: data?.counts.active ?? 0,
    disabled: data?.counts.disabled ?? 0,
    temporary: data?.counts.must_change_password ?? 0,
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            People
          </h1>
          <p className="text-muted-foreground">
            Who can log in, what role they have, and where they work.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton what="people" />
          <Button onClick={() => setAdding(true)}>
            <UserPlusIcon data-icon="inline-start" />
            Add person
          </Button>
        </div>
      </div>

      {people.isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : people.error ? (
        <ErrorState
          title="Couldn't load the people list"
          message={people.error.message}
          onRetry={() => people.refetch()}
          retrying={people.isFetching}
        />
      ) : data ? (
        <>
          <div className="grid grid-cols-3 divide-x rounded-xl border bg-card">
            {(Object.keys(FILTERS) as Filter[]).map((key) => (
              <FactFilter
                key={key}
                filter={key}
                value={counts[key]}
                on={filter === key}
                onClick={() => setFilter(filter === key ? null : key)}
              />
            ))}
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
            {filter && (
              <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-sm md:px-5">
                <span className="text-muted-foreground">Showing</span>
                <button
                  type="button"
                  onClick={() => setFilter(null)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-medium hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  aria-label={`Clear filter: ${FILTERS[filter].label}`}
                >
                  {FILTERS[filter].label}
                  <XIcon className="size-3.5 text-muted-foreground" />
                </button>
                <span className="text-muted-foreground tabular-nums">
                  {rows.length} of {data.people.length}
                </span>
              </div>
            )}

            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {filter ? FILTERS[filter].empty : "Nobody here yet."}
                </p>
                {filter ? (
                  <Button variant="outline" onClick={() => setFilter(null)}>
                    Show everyone
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setAdding(true)}>
                    <UserPlusIcon data-icon="inline-start" />
                    Add person
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Phones: one stacked row per person, nothing hidden off to the side. */}
                <ul className="flex flex-col divide-y md:hidden">
                  {rows.map((p) => (
                    <li key={p.user}>
                      <Link
                        href={open(p)}
                        className="flex items-start gap-3 px-4 py-3.5 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                      >
                        <PersonAvatar
                          user={p.user}
                          name={p.name}
                          size="default"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="truncate">{p.name}</span>
                              {p.is_you && <YouTag />}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {p.email}
                            </span>
                          </span>
                          <RoleChips roles={p.roles} />
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <BranchLabel branches={p.branches} />
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(p.last_login)}
                            </span>
                          </span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <PersonStatus enabled={p.enabled} />
                            {p.must_change_password && <TemporaryTag />}
                          </span>
                        </span>
                        <ChevronRightIcon className="mt-2.5 size-4 shrink-0 text-muted-foreground/60" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="overflow-x-auto max-md:hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                        <th className="px-5 py-2.5 font-medium">Person</th>
                        <th className="px-3 py-2.5 font-medium">Role</th>
                        <th className="px-3 py-2.5 font-medium">Works at</th>
                        <th className="px-3 py-2.5 font-medium">Last login</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="w-8" aria-label="Open" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((p) => (
                        <tr
                          key={p.user}
                          onClick={() => router.push(open(p))}
                          className="cursor-pointer transition-colors hover:bg-muted/40"
                        >
                          <td className="px-5 py-3">
                            <Link
                              href={open(p)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            >
                              <PersonAvatar
                                user={p.user}
                                name={p.name}
                                size="default"
                              />
                              <span className="flex min-w-0 flex-col">
                                <span className="flex items-center gap-1.5 font-medium">
                                  {p.name}
                                  {p.is_you && <YouTag />}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                  {p.email}
                                </span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <RoleChips roles={p.roles} />
                          </td>
                          <td className="px-3 py-3">
                            <BranchLabel branches={p.branches} />
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {timeAgo(p.last_login)}
                          </td>
                          <td className="px-3 py-3">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <PersonStatus enabled={p.enabled} />
                              {p.must_change_password && <TemporaryTag />}
                            </span>
                          </td>
                          <td className="pr-4">
                            <ChevronRightIcon className="size-4 text-muted-foreground/60" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <AddPersonDialog
            open={adding}
            onOpenChange={setAdding}
            roles={data.roles}
            branches={data.branches}
          />
        </>
      ) : null}
    </div>
  )
}
