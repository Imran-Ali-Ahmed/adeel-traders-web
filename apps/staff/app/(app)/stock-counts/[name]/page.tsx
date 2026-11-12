"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardCheckIcon,
  DownloadIcon,
  ListChecksIcon,
  PlusIcon,
  ScanBarcodeIcon,
  ScaleIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { CountStatus } from "@/components/stock-counts/count-status"
import { ConfirmDialog } from "@/components/ui-kit/confirm-dialog"
import { StatCard } from "@/components/ui-kit/stat-card"
import { api, type NeedsBatch, type StockCount } from "@/lib/api"
import { DocumentActions } from "@/components/ui-kit/document-actions"
import { downloadReportCsv } from "@/lib/count-report"
import { formatQty, formatRs, shortWarehouse } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

function isNeedsBatch(x: StockCount | NeedsBatch): x is NeedsBatch {
  return "needs_batch" in x
}

/** A counted quantity that saves when you leave the field. */
function CountedInput({
  count,
  row,
  value,
  onSaved,
}: {
  count: string
  row: string
  value: number
  onSaved: (c: StockCount) => void
}) {
  const [text, setText] = React.useState(String(value))
  React.useEffect(() => setText(String(value)), [value])
  const mutation = useMutation({
    mutationFn: (n: number) => api.setCounted(count, row, n),
    onSuccess: onSaved,
    onError: (e) => {
      notifyError(e)
      setText(String(value))
    },
  })
  return (
    <Input
      aria-label="Counted quantity"
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Number(text)
        if (text.trim() === "" || Number.isNaN(n) || n < 0)
          return setText(String(value))
        if (n !== value) mutation.mutate(n)
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="h-8 w-20 text-right font-semibold tabular-nums"
    />
  )
}

/** While the count is open a gap only means "not scanned yet", so it gets no alarm colours. */
function DifferencePill({ value, open }: { value: number; open?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-14 justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        open
          ? "bg-muted text-foreground/70"
          : value === 0
            ? "bg-success/10 text-success"
            : value < 0
              ? "bg-destructive/10 text-destructive"
              : "bg-warning/12 text-warning"
      )}
    >
      {value === 0
        ? "OK"
        : `${value > 0 ? "+" : "−"}${formatQty(Math.abs(value))}`}
    </span>
  )
}

export default function StockCountPage() {
  const { name: raw } = useParams<{ name: string }>()
  const name = decodeURIComponent(raw)
  const router = useRouter()
  const queryClient = useQueryClient()
  const count = useQuery({
    queryKey: ["stock-count", name],
    queryFn: () => api.getCount(name),
    retry: false,
  })
  const scanBox = React.useRef<HTMLInputElement>(null)
  const [code, setCode] = React.useState("")
  const [lastScan, setLastScan] = React.useState<string | null>(null)
  const [pickBatch, setPickBatch] = React.useState<NeedsBatch | null>(null)
  const [confirmSubmit, setConfirmSubmit] = React.useState(false)
  const [confirmCancel, setConfirmCancel] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const update = (c: StockCount) => {
    queryClient.setQueryData(["stock-count", name], c)
    queryClient.invalidateQueries({ queryKey: ["stock-counts"] })
  }
  const refreshStock = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] })
    queryClient.invalidateQueries({ queryKey: ["product"] })
    queryClient.invalidateQueries({ queryKey: ["stock-history"] })
  }

  const scan = useMutation({
    mutationFn: (args: { code: string; batch_no?: string }) =>
      api.scanCount({ name, code: args.code, batch_no: args.batch_no }),
    onSuccess: (result, args) => {
      if (isNeedsBatch(result)) {
        setPickBatch(result)
        return
      }
      update(result)
      // confirm what the scan did, so the person scanning never has to look away
      const hit =
        result.rows.find(
          (r) =>
            r.item_code === args.code ||
            (args.batch_no && r.batch_no === args.batch_no)
        ) ?? result.rows[result.rows.length - 1]
      setLastScan(
        hit ? `${hit.item_name}: counted ${formatQty(hit.counted)}` : null
      )
      setCode("")
      scanBox.current?.focus()
    },
    onError: (e) => {
      notifyError(e, "Not added")
      setLastScan(null)
      scanBox.current?.select()
    },
  })
  const removeRow = useMutation({
    mutationFn: (row: string) => api.removeCountRow(name, row),
    onSuccess: update,
    onError: (e) => notifyError(e),
  })
  const zero = useMutation({
    mutationFn: (value: boolean) => api.setUnscannedAsZero(name, value),
    onSuccess: update,
    onError: (e) => notifyError(e),
  })
  const submit = useMutation({
    mutationFn: () => api.submitCount(name),
    onSuccess: (c) => {
      update(c)
      setConfirmSubmit(false)
      notifySuccess(
        "Count posted",
        c.stock_reconciliation ?? "No differences to post"
      )
      refreshStock()
    },
    onError: (e) => notifyError(e, "Couldn't post the count"),
  })
  const cancel = useMutation({
    mutationFn: () => api.cancelCount(name),
    onSuccess: (c) => {
      update(c)
      setConfirmCancel(false)
      notifySuccess("Count cancelled", "Stock is back to what it was")
      refreshStock()
    },
    onError: (e) => notifyError(e, "Couldn't cancel the count"),
  })
  const remove = useMutation({
    mutationFn: () => api.deleteCount(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-counts"] })
      router.push("/stock-counts")
    },
    onError: (e) => {
      setConfirmDelete(false)
      notifyError(e)
    },
  })

  const c = count.data
  if (count.isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }
  if (count.error || !c) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-destructive">
          {count.error?.message ?? "Count not found."}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          nativeButton={false}
          render={<Link href="/stock-counts" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to stock counts
        </Button>
      </div>
    )
  }

  const draft = c.status === "Draft"
  const place = shortWarehouse(c.warehouse)
  // Counters count "blind": the server sends system numbers only to people who can post.
  const showSystem = c.rows.every((r) => r.system !== null)
  const hasReport = showSystem && (c.rows.length > 0 || c.unscanned.length > 0)
  const different = c.totals.rows_with_difference ?? 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="order-1 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">
            Count at {place}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{c.name}</span>
            <CountStatus status={c.status} />
            {c.stock_reconciliation && (
              <span>
                {c.status === "Cancelled" ? "Was posted as" : "Posted as"}{" "}
                {c.stock_reconciliation}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasReport && (
            <>
              <Button
                variant="outline"
                className="max-md:h-10"
                onClick={() => downloadReportCsv(c, place)}
              >
                <DownloadIcon data-icon="inline-start" />
                Export
              </Button>
            </>
          )}
          <DocumentActions
            doctype="Stock Count"
            name={c.name}
            title={`Stock count ${c.name} (${place})`}
            format="Stock Count Sheet"
            canEmail={c.can.email}
          />
          {draft && c.can.edit && (
            <Button
              variant="outline"
              className="max-md:h-10"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              Delete draft
            </Button>
          )}
          {c.can.cancel && (
            <Button
              variant="outline"
              className="max-md:h-10"
              onClick={() => setConfirmCancel(true)}
            >
              <Undo2Icon data-icon="inline-start" />
              Cancel count
            </Button>
          )}
          {c.can.submit && (
            <Button
              className="max-md:h-10"
              onClick={() =>
                c.rows.length === 0 && !c.unscanned_as_zero
                  ? notifyError(
                      new Error("Scan at least one product before posting.")
                    )
                  : setConfirmSubmit(true)
              }
            >
              <ClipboardCheckIcon data-icon="inline-start" />
              Post count
            </Button>
          )}
        </div>
      </div>

      <div className="order-3 grid gap-3 sm:order-2 sm:grid-cols-3">
        <StatCard
          icon={ListChecksIcon}
          tone={1}
          label="Products counted"
          value={formatQty(c.totals.rows)}
          caption={`${formatQty(c.totals.counted)} ${c.totals.counted === 1 ? "unit" : "units"} in total`}
        />
        <StatCard
          icon={ScaleIcon}
          tone={3}
          label="With a difference"
          value={showSystem ? formatQty(different) : "—"}
          emphasis={
            showSystem && !draft && different > 0 ? "warning" : undefined
          }
          caption={
            !showSystem
              ? "Shown to the manager who posts"
              : draft
                ? "Counted vs system, so far"
                : "Counted vs system"
          }
        />
        <StatCard
          icon={ScaleIcon}
          tone={5}
          label="Difference value"
          value={
            showSystem && c.totals.difference_value !== null
              ? formatRs(c.totals.difference_value)
              : "—"
          }
          emphasis={
            showSystem && !draft && (c.totals.difference_value ?? 0) < 0
              ? "destructive"
              : undefined
          }
          caption={
            c.totals.difference_value === null
              ? "Managers only"
              : draft
                ? "At cost, so far"
                : "At cost"
          }
        />
      </div>

      {draft && c.can.edit && (
        <form
          className="order-2 sm:order-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (code.trim()) scan.mutate({ code: code.trim() })
            else scanBox.current?.focus()
          }}
        >
          <InputGroup className="h-14 rounded-xl bg-card">
            <InputGroupAddon>
              <ScanBarcodeIcon className="size-5" />
            </InputGroupAddon>
            <InputGroupInput
              ref={scanBox}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Scan or type a code"
              aria-label="Scan a product"
              enterKeyHint="go"
              autoComplete="off"
              autoCapitalize="none"
              className="text-base"
            />
            <InputGroupAddon align="inline-end">
              <Button
                type="submit"
                size="sm"
                className="h-11 px-5"
                disabled={scan.isPending}
              >
                {scan.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Add
              </Button>
            </InputGroupAddon>
          </InputGroup>
          <p
            className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {lastScan ? (
              <>
                <CheckIcon className="size-3.5 text-success" />
                <span className="font-medium text-foreground">{lastScan}</span>
              </>
            ) : (
              "Scan or type a code, then press Enter or tap Add. Each one adds 1; change the number in the list to count many at once."
            )}
          </p>
        </form>
      )}

      {draft && c.can.submit && (
        <label className="order-4 flex w-fit cursor-pointer items-start gap-3 text-sm">
          <Checkbox
            checked={c.unscanned_as_zero}
            onCheckedChange={(checked) => zero.mutate(Boolean(checked))}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">
              Full count: products I don&apos;t scan are missing
            </span>
            <span className="block text-muted-foreground">
              Anything with stock here that is not scanned is set to zero when
              you post. Products with batches must always be scanned.
            </span>
          </span>
        </label>
      )}

      <section className="order-5 overflow-hidden rounded-xl border bg-card">
        {c.rows.length === 0 && c.unscanned.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nothing counted yet. Scan the first product on the shelf.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 text-left font-semibold">
                    Product
                  </th>
                  {showSystem && (
                    <th className="px-3 py-2.5 text-right font-semibold">
                      System
                    </th>
                  )}
                  <th className="px-3 py-2.5 text-right font-semibold">
                    Counted
                  </th>
                  {showSystem && (
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Difference
                    </th>
                  )}
                  {draft && c.can.edit && <th className="w-12 pr-5" />}
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {[
                  ...c.rows.filter((r) => !r.not_scanned).reverse(),
                  ...c.rows.filter((r) => r.not_scanned),
                ].map((r) => (
                  <tr
                    key={r.row}
                    className={r.not_scanned ? "bg-warning/5" : undefined}
                  >
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{r.item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.item_code}
                        {r.batch_no ? ` · batch ${r.batch_no}` : ""}
                        {r.not_scanned ? " · not scanned, counted as zero" : ""}
                      </div>
                    </td>
                    {showSystem && (
                      <td className="px-3 py-2.5 text-right">
                        {formatQty(r.system ?? 0)}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-right">
                      {draft && c.can.edit ? (
                        <div className="flex justify-end">
                          <CountedInput
                            count={name}
                            row={r.row}
                            value={r.counted}
                            onSaved={update}
                          />
                        </div>
                      ) : (
                        <span className="font-semibold">
                          {formatQty(r.counted)}
                        </span>
                      )}
                    </td>
                    {showSystem && (
                      <td className="px-3 py-2.5 text-right">
                        <DifferencePill
                          value={r.difference ?? 0}
                          open={draft}
                        />
                        {r.difference !== 0 && r.difference_value !== null && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {formatRs(r.difference_value)}
                          </div>
                        )}
                      </td>
                    )}
                    {draft && c.can.edit && (
                      <td className="pr-5 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${r.item_name}`}
                          onClick={() => removeRow.mutate(r.row)}
                        >
                          <Trash2Icon />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {c.unscanned.map((m) => (
                  <tr key={`missing-${m.item_code}`} className="bg-warning/5">
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{m.item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.item_code} · not scanned, counts as zero
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {formatQty(m.system)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      0
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DifferencePill value={m.difference} open={draft} />
                      {m.difference_value !== null && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {formatRs(m.difference_value)}
                        </div>
                      )}
                    </td>
                    {draft && c.can.edit && <td className="pr-5" />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={pickBatch !== null}
        onOpenChange={(open) => !open && setPickBatch(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Which batch?</DialogTitle>
            <DialogDescription>
              {pickBatch?.item_name} tracks batches. Choose the batch printed on
              the one you scanned.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2">
            {(pickBatch?.batches ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">
                No batch of this product is recorded at this location.
              </li>
            )}
            {(pickBatch?.batches ?? []).map((b) => (
              <li key={b.batch_no}>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    scan.mutate({
                      code: pickBatch!.item_code,
                      batch_no: b.batch_no,
                    })
                    setPickBatch(null)
                  }}
                >
                  <span className="font-mono">{b.batch_no}</span>
                  {showSystem && (
                    <span className="text-muted-foreground">
                      {formatQty(b.qty)} recorded
                    </span>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this draft count?"
        description={`The draft${c.rows.length ? ` and the ${c.rows.length} product(s) counted so far are` : " is"} removed for good. Stock is not changed, because nothing was posted.`}
        confirmLabel="Delete draft"
        cancelLabel="Keep it"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this count?</DialogTitle>
            <DialogDescription>
              The stock correction is reversed and {place} goes back to the
              quantities it had before this count. The count stays in the list
              as Cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              {cancel.isPending && <Spinner data-icon="inline-start" />}
              Cancel count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post this count?</DialogTitle>
            <DialogDescription>
              {different === 0
                ? "Everything matched. The count is closed and nothing changes in stock."
                : `${different} product(s) differ. Stock at ${place} is set to the counted quantities${c.totals.difference_value !== null ? ` (difference ${formatRs(c.totals.difference_value)} at cost)` : ""}. You can still cancel the count afterwards if it was a mistake.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>
              Cancel
            </Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending && <Spinner data-icon="inline-start" />}
              Post count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
