"use client"

import * as React from "react"
import { SheetIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

import { useCan } from "@/components/session"
import { FrappeError } from "@/lib/frappe"
import { notifyError, notifySuccess } from "@/lib/notify"

const METHOD = "/api/method/adeel_traders.api.v1.export.export_list"

/**
 * "Export" to Excel (P1.9). The server builds the file from the same list function as the screen,
 * so the filters passed here give exactly the rows on screen. Shown only to people whose role
 * has "Can export lists"; the server checks again.
 */
export function ExportButton({
  what,
  filters = {},
  label = "Export",
  size = "default",
}: {
  what: "products" | "people" | "stock-counts" | "report"
  filters?: Record<string, string | number | undefined | null>
  label?: string
  size?: "default" | "lg"
}) {
  const can = useCan("export.lists")
  const [busy, setBusy] = React.useState(false)
  if (!can) return null

  const run = async () => {
    setBusy(true)
    try {
      const q = new URLSearchParams({ what })
      for (const [k, v] of Object.entries(filters))
        if (v !== undefined && v !== null && v !== "") q.set(k, String(v))
      const res = await fetch(`${METHOD}?${q}`, { credentials: "same-origin" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new FrappeError(
          typeof body.message === "string"
            ? body.message
            : "You don't have permission to export this list.",
          res.status
        )
      }
      const name =
        /filename="?([^";]+)"?/.exec(
          res.headers.get("content-disposition") ?? ""
        )?.[1] ?? `${what}.xlsx`
      const link = document.createElement("a")
      link.href = URL.createObjectURL(await res.blob())
      link.download = decodeURIComponent(name)
      link.click()
      URL.revokeObjectURL(link.href)
      notifySuccess("Excel file downloaded")
    } catch (e) {
      notifyError(e, "Couldn't export")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" size={size} onClick={run} disabled={busy}>
      {busy ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <SheetIcon data-icon="inline-start" />
      )}
      {label}
    </Button>
  )
}
