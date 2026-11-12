"use client"

import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { formatDate, formatQty, formatRs } from "@/lib/format"

export type ColumnType = "text" | "qty" | "money" | "date"

export type DataColumn<Row> = {
  key: string
  label: string
  type?: ColumnType
  /** Custom cell; the default formats by type. `index` is the row's place on this page. */
  render?: (row: Row, index: number) => React.ReactNode
  /** Extra classes for this column's cells (e.g. quieter or bolder numbers). */
  className?: string
  sortable?: boolean
  /** Hidden below the md breakpoint (the row stays readable on phones). */
  hideOnPhone?: boolean
}

const numeric = (t?: ColumnType) => t === "qty" || t === "money"

export function formatCell(value: unknown, type?: ColumnType) {
  if (value === null || value === undefined || value === "") return "—"
  if (type === "money") return formatRs(Number(value))
  if (type === "qty") return formatQty(Number(value))
  if (type === "date") return formatDate(String(value))
  return String(value)
}

/**
 * The one table for lists and reports (DESIGN.md §3 DataTable): sticky header, numbers right
 * aligned with tabular figures, sort by clicking a header, paging, a totals row, and the
 * loading / empty states. Sorting and paging are done by the server; this only asks for them.
 */
export function DataTable<Row extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  loading,
  sort,
  onSort,
  totals,
  totalsLabel = "Total",
  totalsNote,
  page,
  onRowClick,
  empty,
  compact,
  className,
}: {
  columns: DataColumn<Row>[]
  rows: Row[]
  rowKey: (row: Row, index: number) => string
  loading?: boolean
  /** "field" or "-field" (descending). */
  sort?: string
  onSort?: (sort: string) => void
  totals?: Record<string, number>
  /** First cell of the totals row (default "Total"). */
  totalsLabel?: string
  /** A line under the totals that stays pinned with them, so it is always in view. */
  totalsNote?: React.ReactNode
  page?: {
    start: number
    length: number
    total: number
    onChange: (start: number) => void
  }
  onRowClick?: (row: Row) => void
  empty?: React.ReactNode
  compact?: boolean
  className?: string
}) {
  const sortKey = sort?.replace(/^-/, "")
  const desc = sort?.startsWith("-")
  const cellY = compact ? "py-1.5" : "py-2.5"
  const hide = (c: DataColumn<Row>) => c.hideOnPhone && "max-md:hidden"

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b text-left text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]">
              {columns.map((c, i) => {
                const active = sortKey === c.key
                const canSort = onSort && c.sortable !== false
                const label = (
                  <>
                    {c.label}
                    {active ? (
                      desc ? (
                        <ArrowDownIcon className="size-3.5" />
                      ) : (
                        <ArrowUpIcon className="size-3.5" />
                      )
                    ) : (
                      canSort && (
                        <ArrowUpDownIcon className="size-3.5 opacity-0 transition-opacity group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60" />
                      )
                    )}
                  </>
                )
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={
                      active ? (desc ? "descending" : "ascending") : undefined
                    }
                    className={cn(
                      "bg-muted/40 px-3 py-2.5 font-medium whitespace-nowrap",
                      i === 0 && "pl-5",
                      numeric(c.type) && "text-right",
                      hide(c)
                    )}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSort(active && !desc ? `-${c.key}` : c.key)
                        }
                        className={cn(
                          "group/sort inline-flex cursor-pointer items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                          active && "text-foreground",
                          numeric(c.type) && "flex-row-reverse"
                        )}
                      >
                        {label}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 6 }, (_, r) => (
                <tr key={r}>
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={cn("px-3", cellY, i === 0 && "pl-5", hide(c))}
                    >
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-muted-foreground"
                >
                  {empty ?? "Nothing to show."}
                </td>
              </tr>
            ) : (
              rows.map((row, r) => (
                <tr
                  key={rowKey(row, r)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "transition-colors hover:bg-muted/40",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3",
                        cellY,
                        i === 0 && "pl-5 font-medium",
                        numeric(c.type) &&
                          "text-right whitespace-nowrap tabular-nums",
                        hide(c),
                        c.className
                      )}
                    >
                      {c.render
                        ? c.render(row, r)
                        : formatCell(row[c.key], c.type)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {totals && !loading && rows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-card">
              <tr className="border-t font-medium shadow-[inset_0_1px_0_var(--border)]">
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={cn(
                      "bg-muted/40 px-3 py-2.5",
                      i === 0 && "pl-5",
                      numeric(c.type) && "text-right tabular-nums",
                      hide(c)
                    )}
                  >
                    {i === 0
                      ? totalsLabel
                      : c.key in totals
                        ? formatCell(totals[c.key], c.type)
                        : null}
                  </td>
                ))}
              </tr>
              {totalsNote && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="border-t bg-card p-0 font-normal"
                  >
                    {totalsNote}
                  </td>
                </tr>
              )}
            </tfoot>
          )}
        </table>
      </div>
      {page && page.total > page.length && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-sm text-muted-foreground md:px-5">
          <span className="tabular-nums">
            {page.start + 1}–{Math.min(page.start + page.length, page.total)} of{" "}
            {page.total}
          </span>
          <span className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={page.start === 0}
              onClick={() =>
                page.onChange(Math.max(page.start - page.length, 0))
              }
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={page.start + page.length >= page.total}
              onClick={() => page.onChange(page.start + page.length)}
            >
              <ChevronRightIcon />
            </Button>
          </span>
        </div>
      )}
    </div>
  )
}
