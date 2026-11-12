"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ClipboardCheckIcon, InboxIcon } from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { DecideButtons } from "@/components/approvals/decide"
import { recordHref } from "@/components/history/areas"
import { PersonAvatar } from "@/components/roles/role-parts"
import { ErrorState } from "@/components/ui-kit/error-state"
import { IconTile } from "@/components/ui-kit/icon-tile"
import { api, type ApprovalItem } from "@/lib/api"
import { formatRs, timeAgo } from "@/lib/format"

function Item({ item }: { item: ApprovalItem }) {
  const href = recordHref(item.doctype, item.name)
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 md:px-5">
      <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {href ? (
            <Link
              href={href}
              className="rounded-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              {item.title}
            </Link>
          ) : (
            <span className="font-medium">{item.title}</span>
          )}
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {item.doctype}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 text-xs font-medium text-warning-ink">
            {item.state}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <PersonAvatar user={item.asked_by} name={item.asked_by_name} />
          Asked by {item.asked_by_name} · {timeAgo(item.since)}
        </span>
      </div>
      {item.amount !== null && (
        <span className="font-heading text-lg font-semibold tabular-nums">
          {formatRs(item.amount)}
        </span>
      )}
      <DecideButtons
        doctype={item.doctype}
        name={item.name}
        title={item.title}
        actions={item.actions}
      />
    </li>
  )
}

export default function ApprovalsPage() {
  const q = useQuery({ queryKey: ["approvals"], queryFn: api.approvals })
  const items = q.data?.items ?? []
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-start gap-3">
        <IconTile icon={ClipboardCheckIcon} tone="emerald" size="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Approvals
          </h1>
          <p className="text-muted-foreground">
            Requests waiting for your decision, oldest first.
          </p>
        </div>
      </div>
      {q.isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : q.error ? (
        <ErrorState
          title="Couldn't load your approvals"
          message={q.error.message}
          onRetry={() => q.refetch()}
          retrying={q.isFetching}
        />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-14 text-center">
          <IconTile icon={InboxIcon} tone="emerald" size="lg" />
          <p className="font-medium">Nothing is waiting for you</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Discounts above the limit, sales over a customer&apos;s credit,
            purchase orders and expenses that need your OK will appear here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {items.map((item) => (
            <Item key={`${item.doctype}-${item.name}`} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}
