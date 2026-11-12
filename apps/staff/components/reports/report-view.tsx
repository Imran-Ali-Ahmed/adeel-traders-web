"use client"

import * as React from "react"
import Link from "next/link"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { WarehouseIcon, type LucideIcon } from "lucide-react"

import { DataTable, type DataColumn } from "@/components/ui-kit/data-table"
import { ErrorState } from "@/components/ui-kit/error-state"
import { ExportButton } from "@/components/ui-kit/export-button"
import { FilterBar, useUrlFilters } from "@/components/ui-kit/filter-bar"
import { IconTile, type Tone } from "@/components/ui-kit/icon-tile"
import { api, type ReportResult } from "@/lib/api"
import { formatDate, formatQty, formatRs, shortWarehouse } from "@/lib/format"

const PAGE = 50
const KEYS = [
  "search",
  "from_date",
  "to_date",
  "branch",
  "category",
  "brand",
  "sort",
  "hide_zero",
  "start",
] as const

type Row = ReportResult["rows"][number]

const same = (a: Row | undefined, b: Row) => !!a && a.item_code === b.item_code

/** A movement: "+22" came in, "−4" went out, a quiet 0 when nothing moved. */
function Move({ value, dir }: { value: unknown; dir: "in" | "out" }) {
  const n = Number(value) || 0
  if (n === 0) return <span className="text-muted-foreground/60">0</span>
  return (
    <span className={dir === "in" ? "text-success" : undefined}>
      {dir === "in" ? "+" : "−"}
      {formatQty(Math.abs(n))}
    </span>
  )
}

/**
 * Cells that read better than the raw value. The product shows once with its code underneath,
 * and a product sold from two locations is not repeated on the next row.
 */
function cell(key: string, rows: Row[]): DataColumn<Row>["render"] {
  if (key === "item_name")
    return (r, i) =>
      same(rows[i - 1], r) ? (
        <span className="sr-only">{r.item_name}</span>
      ) : (
        <span className="flex flex-col">
          <Link
            href={`/products/${encodeURIComponent(String(r.item_code))}`}
            className="w-fit rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            {r.item_name}
          </Link>
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {r.item_code}
          </span>
        </span>
      )
  if (key === "item_group" || key === "brand")
    return (r, i) =>
      same(rows[i - 1], r) ? (
        <span className="sr-only">{String(r[key] ?? "")}</span>
      ) : r[key] ? (
        String(r[key])
      ) : (
        <span className="text-muted-foreground/60">—</span>
      )
  if (key === "warehouse")
    return (r) =>
      r.warehouse ? (
        r.note ? (
          // damaged, returns and testers: red, and never part of the total (DESIGN.md rule 4)
          <span className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-destructive">
            <WarehouseIcon className="size-3.5" />
            {shortWarehouse(String(r.warehouse))}
            <span className="text-xs font-medium">· Not for sale</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
            <WarehouseIcon className="size-3.5 text-chart-6" />
            {shortWarehouse(String(r.warehouse))}
          </span>
        )
      ) : (
        "—"
      )
  if (key === "in_qty") return (r) => <Move value={r.in_qty} dir="in" />
  if (key === "out_qty") return (r) => <Move value={r.out_qty} dir="out" />
  return undefined
}

/** Quieter or stronger numbers, so the eye lands on what is left (Balance). */
const CELL_CLASS: Record<string, string> = {
  opening_qty: "text-muted-foreground",
  bal_qty: "font-semibold",
}

/**
 * One report page (DESIGN.md: report kit, P1.10): title, standard filters in the URL, the table
 * with a totals row and paging. Rows, totals and hidden cost columns all come from the server.
 */
export function ReportView({
  report,
  icon,
  tone,
  actions,
}: {
  report: string
  icon: LucideIcon
  tone: Tone
  actions?: (data: ReportResult | undefined) => React.ReactNode
}) {
  const [f, setF] = useUrlFilters(KEYS)
  const start = Number(f.start) || 0
  const params = {
    search: f.search,
    from_date: f.from_date,
    to_date: f.to_date,
    branch: f.branch,
    category: f.category,
    brand: f.brand,
    sort: f.sort || "item_name",
    hide_zero: f.hide_zero,
    start,
    page_length: PAGE,
  }
  const q = useQuery({
    queryKey: ["report", report, params],
    queryFn: () => api.runReport(report, params),
    placeholderData: keepPreviousData,
  })
  const data = q.data
  const onChange = React.useCallback(
    (patch: Record<string, string | undefined>) =>
      setF(
        Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v ?? ""]))
      ),
    [setF]
  )

  const rows = data?.rows ?? []
  // The code now sits under the product name, so it does not need a column of its own.
  const columns: DataColumn<Row>[] = (data?.columns ?? [])
    .filter((c) => c.key !== "item_code" && c.key !== "note")
    .map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
      render: cell(c.key, rows),
      className: CELL_CLASS[c.key],
      hideOnPhone: [
        "item_group",
        "brand",
        "opening_qty",
        "in_qty",
        "out_qty",
      ].includes(c.key),
    }))
  const show = data
    ? ([
        "search",
        ...(data.filters.includes("dates") ? ["from_date"] : []),
        ...data.filters.filter((x) => x !== "dates"),
      ] as ("search" | "from_date" | "branch" | "category" | "brand")[])
    : []

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-start gap-3">
        <IconTile icon={icon} tone={tone} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {data?.title ?? "Report"}
          </h1>
          <p className="text-muted-foreground">
            {data?.description}
            {data && (
              <>
                {" "}
                <span className="whitespace-nowrap">
                  {formatDate(data.applied.from_date)} to{" "}
                  {formatDate(data.applied.to_date)}.
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {q.error && !data ? (
        <ErrorState
          title="Couldn't run the report"
          message={q.error.message}
          onRetry={() => q.refetch()}
          retrying={q.isFetching}
        />
      ) : (
        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
          <FilterBar
            show={show}
            values={f}
            dateDefaults={data?.applied}
            toggle={
              data?.filters.includes("branch")
                ? {
                    label: "Hide zero stock",
                    checked: f.hide_zero === "1",
                    onChange: (on) => setF({ hide_zero: on ? "1" : "" }),
                  }
                : undefined
            }
            onChange={onChange}
            options={data?.options ?? {}}
            actions={
              <>
                <ExportButton
                  what="report"
                  filters={{ report, ...f, sort: params.sort }}
                />
                {actions?.(data)}
              </>
            }
          />
          <DataTable<Row>
            columns={columns}
            rows={rows}
            rowKey={(r, i) => `${r.item_code}|${r.warehouse}|${i}`}
            loading={!data}
            sort={params.sort}
            onSort={(sort) => setF({ sort })}
            totals={data?.totals}
            totalsLabel="Total to sell"
            totalsNote={
              data?.not_for_sale_totals ? (
                <p className="flex flex-wrap items-center gap-x-2 bg-destructive/5 px-5 py-2.5 text-sm text-destructive">
                  <span className="font-medium">
                    Not for sale, not in the total:
                  </span>
                  <span className="tabular-nums">
                    {formatQty(data.not_for_sale_totals.bal_qty)} pieces
                    {data.not_for_sale_totals.bal_val !== undefined &&
                      ` · ${formatRs(data.not_for_sale_totals.bal_val)}`}
                  </span>
                  <span className="text-muted-foreground">
                    (damaged, returns to check and testers)
                  </span>
                </p>
              ) : undefined
            }
            page={
              data
                ? {
                    start,
                    length: PAGE,
                    total: data.total,
                    onChange: (s) => setF({ start: s ? String(s) : "" }),
                  }
                : undefined
            }
            empty="Nothing matches these dates and filters. Try other dates or clear the filters."
          />
        </section>
      )}
    </div>
  )
}
