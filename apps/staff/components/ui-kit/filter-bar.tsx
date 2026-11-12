"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon, XIcon } from "lucide-react"

import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

/**
 * Filters live in the URL (?branch=…&from_date=…), so a filtered list can be shared, reloaded
 * and reached again with Back. Setting a filter returns to the first page.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const values = Object.fromEntries(
    keys.map((k) => [k, params.get(k) ?? ""])
  ) as Record<K, string>
  const set = React.useCallback(
    (patch: Partial<Record<K, string>>) => {
      const next = new URLSearchParams(params.toString())
      for (const [k, v] of Object.entries(patch) as [K, string][]) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      if (!("start" in patch)) next.delete("start")
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    },
    [params, pathname, router]
  )
  return [values, set] as const
}

const ALL = "__all__"

const pad = (n: number) => String(n).padStart(2, "0")
/** Local calendar date as YYYY-MM-DD (not UTC, so late evening is still today in Pakistan). */
const iso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Quick periods for a date range. Pure calendar sums: no business rule. */
const PERIODS: Record<
  string,
  { label: string; range: (now: Date) => [Date, Date] }
> = {
  today: { label: "Today", range: (n) => [n, n] },
  this_month: {
    label: "This month",
    range: (n) => [new Date(n.getFullYear(), n.getMonth(), 1), n],
  },
  last_month: {
    label: "Last month",
    range: (n) => [
      new Date(n.getFullYear(), n.getMonth() - 1, 1),
      new Date(n.getFullYear(), n.getMonth(), 0),
    ],
  },
  last_30: {
    label: "Last 30 days",
    range: (n) => [
      new Date(n.getFullYear(), n.getMonth(), n.getDate() - 29),
      n,
    ],
  },
  this_year: {
    label: "This year",
    range: (n) => [new Date(n.getFullYear(), 0, 1), n],
  },
}
const CUSTOM = "__custom__"
const ANY = "__any__"

/** "Period" shortcut: fills both dates at once. Shows "Custom dates" when the dates match none. */
function PeriodFilter({
  match,
  anyTime,
  onPick,
}: {
  /** Key of the quick period the dates match, if any. */
  match: string | undefined
  /** No dates chosen, and "Any time" is a valid choice (lists without a default period). */
  anyTime?: "empty" | "allowed"
  onPick: (from: string, to: string) => void
}) {
  return (
    <Select
      value={anyTime === "empty" ? ANY : (match ?? CUSTOM)}
      onValueChange={(v) => {
        if (v === ANY) return onPick("", "")
        const p = v ? PERIODS[String(v)] : undefined
        if (!p) return
        const [a, b] = p.range(new Date())
        onPick(iso(a), iso(b))
      }}
      items={{
        ...(anyTime ? { [ANY]: "Any time" } : {}),
        ...Object.fromEntries(
          Object.entries(PERIODS).map(([k, p]) => [k, p.label])
        ),
        [CUSTOM]: "Custom dates",
      }}
    >
      <SelectTrigger
        aria-label="Period"
        className="w-full min-w-0 sm:w-auto sm:min-w-36"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {anyTime && <SelectItem value={ANY}>Any time</SelectItem>}
          {Object.entries(PERIODS).map(([k, p]) => (
            <SelectItem key={k} value={k}>
              {p.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function ChoiceFilter({
  label,
  allLabel,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  allLabel: string
  value: string
  options: string[]
  /** Words to show instead of the value (e.g. a person's name for their email). */
  labels?: Record<string, string>
  onChange: (value: string) => void
}) {
  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onChange(!v || v === ALL ? "" : String(v))}
      items={{
        [ALL]: allLabel,
        ...Object.fromEntries(options.map((o) => [o, labels?.[o] ?? o])),
      }}
    >
      <SelectTrigger
        aria-label={label}
        className="w-full min-w-0 sm:w-auto sm:min-w-36"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {labels?.[o] ?? o}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export type FilterValues = {
  search?: string
  from_date?: string
  to_date?: string
  branch?: string
  category?: string
  brand?: string
  /** Page-specific filters passed through `extra` (person, area). */
  [other: string]: string | undefined
}

/**
 * The standard filters of every list and report: search, dates, branch, category, brand.
 * Each screen shows only the ones its data has (`show`). Choices come from the server.
 */
export function FilterBar({
  show,
  values,
  onChange,
  options,
  dateDefaults,
  anyTime,
  searchPlaceholder = "Search name or code",
  extra,
  toggle,
  actions,
}: {
  show: (keyof FilterValues)[]
  values: FilterValues
  onChange: (patch: FilterValues) => void
  options: { branches?: string[]; categories?: string[]; brands?: string[] }
  /** Dates the server used when none are chosen (shown, but not counted as a filter). */
  dateDefaults?: { from_date?: string; to_date?: string }
  /** Words in the empty search box. */
  searchPlaceholder?: string
  /** Offer "Any time" (no dates) in the period menu: for logs that have no default period. */
  anyTime?: boolean
  /** Page-specific filters (person, area) that join the bar; `clearPatch` is sent with "Clear filters". */
  extra?: {
    node: React.ReactNode
    active: boolean
    clearPatch: Record<string, string>
  }
  /** One on/off choice after the filters, e.g. "Hide zero stock". */
  toggle?: {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
  }
  /** Buttons on the right, e.g. Export. */
  actions?: React.ReactNode
}) {
  const [text, setText] = React.useState(values.search ?? "")
  // Search waits for a short pause in typing, so each key press is not a server call.
  React.useEffect(() => {
    if (text === (values.search ?? "")) return
    const t = setTimeout(() => onChange({ search: text }), 350)
    return () => clearTimeout(t)
  }, [text, values.search, onChange])

  const from = values.from_date || dateDefaults?.from_date || ""
  const to = values.to_date || dateDefaults?.to_date || ""
  const match = Object.entries(PERIODS).find(([, p]) => {
    const [a, b] = p.range(new Date())
    return iso(a) === from && iso(b) === to
  })?.[0]

  const active =
    show.filter((k) => k !== "search" && values[k]).length > 0 ||
    !!values.to_date ||
    !!values.search ||
    !!extra?.active

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 md:px-5">
      {show.includes("search") && (
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search"
            className="pl-8"
          />
        </div>
      )}
      {show.includes("from_date") && (
        <PeriodFilter
          match={match}
          anyTime={anyTime ? (from || to ? "allowed" : "empty") : undefined}
          onPick={(from_date, to_date) => onChange({ from_date, to_date })}
        />
      )}
      {show.includes("from_date") && (
        <div className="flex w-full items-center gap-1.5 sm:w-auto">
          <Input
            type="date"
            aria-label="From date"
            value={from}
            max={values.to_date || undefined}
            onChange={(e) => onChange({ from_date: e.target.value })}
            className="min-w-0 flex-1 sm:w-38 sm:flex-none"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={to}
            min={values.from_date || undefined}
            onChange={(e) => onChange({ to_date: e.target.value })}
            className="min-w-0 flex-1 sm:w-38 sm:flex-none"
          />
        </div>
      )}
      {show.includes("branch") && !!options.branches?.length && (
        <ChoiceFilter
          label="Branch"
          allLabel="All branches"
          value={values.branch ?? ""}
          options={options.branches}
          onChange={(branch) => onChange({ branch })}
        />
      )}
      {show.includes("category") && !!options.categories?.length && (
        <ChoiceFilter
          label="Category"
          allLabel="All categories"
          value={values.category ?? ""}
          options={options.categories}
          onChange={(category) => onChange({ category })}
        />
      )}
      {show.includes("brand") && !!options.brands?.length && (
        <ChoiceFilter
          label="Brand"
          allLabel="All brands"
          value={values.brand ?? ""}
          options={options.brands}
          onChange={(brand) => onChange({ brand })}
        />
      )}
      {extra?.node}
      {toggle && (
        <label className="flex cursor-pointer items-center gap-2 px-1 text-sm">
          <Checkbox
            checked={toggle.checked}
            onCheckedChange={(v) => toggle.onChange(Boolean(v))}
          />
          {toggle.label}
        </label>
      )}
      {active && (
        <button
          type="button"
          onClick={() => {
            setText("")
            onChange({
              ...extra?.clearPatch,
              ...(Object.fromEntries(show.map((k) => [k, ""])) as FilterValues),
              to_date: "",
            })
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <XIcon className="size-3.5" />
          Clear filters
        </button>
      )}
      {actions && (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
