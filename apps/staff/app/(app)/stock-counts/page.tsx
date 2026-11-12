"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ClipboardCheckIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { ExportButton } from "@/components/ui-kit/export-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Field, FieldGroup } from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { CountStatus } from "@/components/stock-counts/count-status"
import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { api } from "@/lib/api"
import { formatDate, formatQty, shortWarehouse } from "@/lib/format"
import { notifyError } from "@/lib/notify"

function NewCountDialog({
  open,
  onOpenChange,
  warehouses,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouses: string[]
}) {
  const router = useRouter()
  const [warehouse, setWarehouse] = React.useState("")
  const check = useFormCheck({
    count_wh: warehouse ? undefined : "Choose the location you are counting.",
  })
  React.useEffect(() => {
    if (open) {
      setWarehouse("")
      check.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open])
  const mutation = useMutation({
    mutationFn: () => api.startCount(warehouse),
    onSuccess: (count) =>
      router.push(`/stock-counts/${encodeURIComponent(count.name)}`),
    onError: (e) => notifyError(e, "Couldn't start the count"),
  })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New stock count</DialogTitle>
          <DialogDescription>
            Count one location at a time by scanning each product on the shelf.
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-count"
          noValidate
          onSubmit={(e) => check.submit(e, () => mutation.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("count_wh")}>
              <RequiredLabel htmlFor="count_wh">Location</RequiredLabel>
              <Select
                value={warehouse || null}
                onValueChange={(v) => setWarehouse(v ?? "")}
                items={Object.fromEntries(
                  warehouses.map((w) => [w, shortWarehouse(w)])
                )}
              >
                <SelectTrigger
                  id="count_wh"
                  className="w-full"
                  aria-invalid={check.invalid("count_wh")}
                >
                  <SelectValue placeholder="Choose a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {warehouses.map((w) => (
                      <SelectItem key={w} value={w}>
                        {shortWarehouse(w)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldHint error={check.error("count_wh")} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="new-count" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Start counting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function StockCountsPage() {
  const counts = useQuery({
    queryKey: ["stock-counts"],
    queryFn: api.stockCounts,
  })
  const [creating, setCreating] = React.useState(false)
  const data = counts.data

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Stock counts
          </h1>
          <p className="text-muted-foreground">
            Count shelves by scanning. A manager posts the differences to stock.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton what="stock-counts" size="lg" />
          {data?.can_create && (
            <Button size="lg" onClick={() => setCreating(true)}>
              <PlusIcon data-icon="inline-start" />
              New count
            </Button>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        {counts.isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : counts.error ? (
          <p className="p-5 text-destructive">{counts.error.message}</p>
        ) : (data?.counts ?? []).length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardCheckIcon />
              </EmptyMedia>
              <EmptyTitle>No stock counts yet</EmptyTitle>
              <EmptyDescription>
                Start a count to check a shelf against the system.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col divide-y">
            {data!.counts.map((c) => (
              <li
                key={c.name}
                className={c.status === "Cancelled" ? "opacity-60" : undefined}
              >
                <Link
                  href={`/stock-counts/${encodeURIComponent(c.name)}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">
                      {shortWarehouse(c.warehouse)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.name} · {formatDate(c.posting_date)} · by {c.by}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatQty(c.counted)} counted
                  </span>
                  <span
                    className={cn(
                      "w-36 text-right text-sm font-medium tabular-nums",
                      c.status !== "Submitted" || c.difference === null
                        ? "text-muted-foreground"
                        : c.difference === 0
                          ? "text-success"
                          : "text-warning"
                    )}
                  >
                    {c.status !== "Submitted" || c.difference === null
                      ? "—"
                      : c.difference === 0
                        ? "No difference"
                        : `${c.difference > 0 ? "+" : "−"}${formatQty(Math.abs(c.difference))} difference`}
                  </span>
                  <CountStatus status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <NewCountDialog
        open={creating}
        onOpenChange={setCreating}
        warehouses={data?.warehouses ?? []}
      />
    </div>
  )
}
