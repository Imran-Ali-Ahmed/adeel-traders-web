"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { api, type ProductDetail } from "@/lib/api"
import { formatQty, shortWarehouse } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

export type StockAction = "transfer" | "adjust"

const ADJUST_HELP: Record<string, string> = {
  Damaged: "Moved to the Damaged location until someone checks it.",
  Tester: "Moved to the Testers location for shop display.",
  Expired: "Removed from stock and written off.",
  Lost: "Removed from stock and written off.",
}

function WarehouseSelect({
  label,
  value,
  onChange,
  options,
  qtyOf,
  id,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  qtyOf?: (warehouse: string) => number
  id: string
  error?: string
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
      <Select
        value={value}
        onValueChange={(v) => onChange(v ?? "")}
        items={Object.fromEntries(options.map((w) => [w, shortWarehouse(w)]))}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
        >
          <SelectValue placeholder="Choose a location" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((w) => (
              <SelectItem key={w} value={w}>
                {shortWarehouse(w)}
                {qtyOf ? ` (${formatQty(qtyOf(w))} in stock)` : ""}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldHint error={error} />
    </Field>
  )
}

export function StockActionDialog({
  action,
  product,
  onOpenChange,
}: {
  action: StockAction | null
  product: ProductDetail
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const options = useQuery({
    queryKey: ["form-options"],
    queryFn: api.formOptions,
  })
  // Stock may only be taken from the user's own branch (and shared locations).
  const own = options.data?.warehouses
  const stocked = (product.warehouses ?? []).filter(
    (w) => w.qty > 0 && (!own || own.includes(w.warehouse))
  )
  const qtyOf = (warehouse: string) =>
    stocked.find((w) => w.warehouse === warehouse)?.qty ?? 0

  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [qty, setQty] = React.useState("")
  const [type, setType] = React.useState("Damaged")
  const [reason, setReason] = React.useState("")

  const amount = Number(qty)
  const check = useFormCheck({
    from: from ? undefined : "Choose where the stock is.",
    to:
      action !== "transfer"
        ? undefined
        : !to
          ? "Choose where the stock goes."
          : to === from
            ? "Choose a different location."
            : undefined,
    qty:
      qty.trim() !== "" && amount > 0 && amount <= qtyOf(from)
        ? undefined
        : `Enter a quantity between 1 and ${formatQty(qtyOf(from))}.`,
    reason:
      action === "adjust" && !reason.trim()
        ? "Write what happened, so others understand later."
        : undefined,
  })

  React.useEffect(() => {
    if (!action) return
    setFrom(stocked[0]?.warehouse ?? "")
    setTo("")
    setQty("")
    setType("Damaged")
    setReason("")
    check.reset()
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, own === undefined])

  const mutation = useMutation({
    mutationFn: () =>
      action === "transfer"
        ? api.transferStock({
            item_code: product.item_code,
            from_warehouse: from,
            to_warehouse: to,
            qty: Number(qty),
          })
        : api.adjustStock({
            item_code: product.item_code,
            warehouse: from,
            qty: Number(qty),
            adjustment_type: type,
            reason,
          }),
    onSuccess: (result) => {
      notifySuccess(
        action === "transfer" ? "Stock moved" : `${type} stock recorded`,
        result.stock_entry
      )
      queryClient.invalidateQueries({
        queryKey: ["product", product.item_code],
      })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({
        queryKey: ["stock-history", product.item_code],
      })
      onOpenChange(false)
    },
    onError: (e) => notifyError(e),
  })

  // Stock may be sent to any branch.
  const targets = (options.data?.all_warehouses ?? []).filter((w) => w !== from)

  return (
    <Dialog open={action !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === "transfer"
              ? "Move stock"
              : "Record damaged, tester or lost stock"}
          </DialogTitle>
          <DialogDescription>
            {action === "transfer"
              ? `${product.item_name}. Moves stock between locations; nothing is sold or written off.`
              : `${product.item_name}. Damaged and tester stock moves to its own location; expired and lost stock is written off.`}
          </DialogDescription>
        </DialogHeader>

        {stocked.length === 0 ? (
          <p className="text-muted-foreground">
            There is no stock of this product to move.
          </p>
        ) : (
          <form
            id="stock-action"
            noValidate
            onSubmit={(e) => check.submit(e, () => mutation.mutate())}
          >
            <FieldGroup>
              {action === "adjust" && (
                <Field>
                  <FieldLabel>What happened</FieldLabel>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v ?? "Damaged")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(options.data?.adjustment_types ?? []).map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>{ADJUST_HELP[type]}</FieldDescription>
                </Field>
              )}
              <WarehouseSelect
                id="from"
                error={check.error("from")}
                label={action === "transfer" ? "From" : "Location"}
                value={from}
                onChange={setFrom}
                options={stocked.map((w) => w.warehouse)}
                qtyOf={qtyOf}
              />
              {action === "transfer" && (
                <WarehouseSelect
                  id="to"
                  error={check.error("to")}
                  label="To"
                  value={to}
                  onChange={setTo}
                  options={targets}
                />
              )}
              <Field data-invalid={check.invalid("qty")}>
                <RequiredLabel htmlFor="qty">
                  Quantity ({product.stock_uom})
                </RequiredLabel>
                <Input
                  id="qty"
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  aria-invalid={check.invalid("qty")}
                />
                <FieldHint
                  error={check.error("qty")}
                  hint={`${formatQty(qtyOf(from))} in stock here.`}
                />
              </Field>
              {action === "adjust" && (
                <Field data-invalid={check.invalid("reason")}>
                  <RequiredLabel htmlFor="reason">Reason</RequiredLabel>
                  <Textarea
                    id="reason"
                    value={reason}
                    aria-invalid={check.invalid("reason")}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="For example: carton crushed in delivery"
                  />
                  <FieldHint error={check.error("reason")} />
                </Field>
              )}
            </FieldGroup>
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="stock-action"
            disabled={mutation.isPending || stocked.length === 0}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            {action === "transfer"
              ? "Move stock"
              : `Record ${type.toLowerCase()} stock`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
