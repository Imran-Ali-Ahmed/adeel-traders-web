import type { StockCount } from "@/lib/api"

type Line = {
  product: string
  code: string
  batch: string
  system: number | null
  counted: number
  difference: number | null
  value: number | null
  note: string
}

/** Every line of the difference report: scanned rows, then products treated as not found. */
export function reportLines(c: StockCount): Line[] {
  const scanned = c.rows.map((r) => ({
    product: r.item_name,
    code: r.item_code,
    batch: r.batch_no ?? "",
    system: r.system,
    counted: r.counted,
    difference: r.difference,
    value: r.difference_value,
    note: r.not_scanned ? "Not scanned, counted as zero" : "",
  }))
  const missing = c.unscanned.map((m) => ({
    product: m.item_name,
    code: m.item_code,
    batch: "",
    system: m.system,
    counted: 0,
    difference: m.difference,
    value: m.difference_value,
    note: "Not scanned, counted as zero",
  }))
  return [...scanned, ...missing]
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function downloadReportCsv(c: StockCount, location: string) {
  const header = [
    "Product",
    "Code",
    "Batch",
    "System",
    "Counted",
    "Difference",
    "Difference value (Rs)",
    "Note",
  ]
  const lines = reportLines(c).map((l) =>
    [
      l.product,
      l.code,
      l.batch,
      l.system,
      l.counted,
      l.difference,
      l.value,
      l.note,
    ]
      .map(csvCell)
      .join(",")
  )
  const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${c.name}-${location.replace(/\s+/g, "-")}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
