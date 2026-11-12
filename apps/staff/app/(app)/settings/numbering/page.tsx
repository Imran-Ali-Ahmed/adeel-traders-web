"use client"

import { useQuery } from "@tanstack/react-query"
import { HashIcon, InfoIcon } from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"

import { ErrorState } from "@/components/ui-kit/error-state"
import { IconTile } from "@/components/ui-kit/icon-tile"
import { api } from "@/lib/api"

export default function NumberingPage() {
  const q = useQuery({ queryKey: ["numbering"], queryFn: api.numbering })
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-start gap-3">
        <IconTile icon={HashIcon} tone="cobalt" size="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Numbering
          </h1>
          <p className="text-muted-foreground">
            How each document is numbered, and the number the next one gets.
          </p>
        </div>
      </div>
      <p className="flex items-start gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        Short numbers per document and branch (for example SI-SHOP-26-00001) are
        chosen with you before the first real invoice. Until then this page only
        shows them.
      </p>
      {q.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : q.error ? (
        <ErrorState
          title="Couldn't load the numbering"
          message={q.error.message}
          onRetry={() => q.refetch()}
          retrying={q.isFetching}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Document</th>
                <th className="px-3 py-2.5 font-medium">Pattern</th>
                <th className="px-3 py-2.5 text-right font-medium">Used</th>
                <th className="px-5 py-2.5 font-medium">Next number</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {q.data?.documents.flatMap((d) =>
                d.series.map((s, i) => (
                  <tr key={`${d.doctype}-${s.series}`}>
                    <td className="px-5 py-2.5 font-medium">
                      {i === 0 ? d.label : ""}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      {s.series}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {s.current ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs">
                      {s.next ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
