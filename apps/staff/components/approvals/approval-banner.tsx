"use client"

import { useQuery } from "@tanstack/react-query"
import { CircleCheckIcon, HourglassIcon } from "lucide-react"

import { DecideButtons } from "@/components/approvals/decide"
import { api } from "@/lib/api"

/**
 * On a document page: where it is in its approval and, for the person who may decide, the
 * buttons. Shows nothing for documents without an approval workflow.
 */
export function ApprovalBanner({
  doctype,
  name,
  title,
}: {
  doctype: string
  name: string
  title: string
}) {
  const state = useQuery({
    queryKey: ["approval", doctype, name],
    queryFn: () => api.approvalState(doctype, name),
  })
  const s = state.data
  if (!s?.workflow || !s.state) return null
  if (s.final)
    return (
      <div className="flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm">
        <CircleCheckIcon className="size-4 text-success" />
        <span className="font-medium">{s.state}</span>
      </div>
    )
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/8 px-4 py-3 text-sm">
      <HourglassIcon className="size-4 text-warning-ink" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{s.state}</span>
        <span className="text-muted-foreground">
          {s.actions.length
            ? "Waiting for your decision."
            : `Waiting for: ${s.waiting_for.join(", ")}.`}
        </span>
      </span>
      {s.actions.length > 0 && (
        <DecideButtons
          doctype={doctype}
          name={name}
          title={title}
          actions={s.actions}
          size="sm"
        />
      )}
    </div>
  )
}
