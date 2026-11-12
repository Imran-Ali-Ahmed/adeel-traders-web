"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, SearchIcon, Trash2Icon } from "lucide-react"

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
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import { Spinner } from "@workspace/ui/components/spinner"

import {
  FieldHint,
  isAmount,
  MoneyInput,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { useCan } from "@/components/session"
import { api, type ProductDetail } from "@/lib/api"
import { formatQty } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

type Part = { item_code: string; item_name: string; qty: string }

/** Find products that have their own stock and add them as parts. */
function PartPicker({
  exclude,
  onPick,
}: {
  exclude: string[]
  onPick: (part: { item_code: string; item_name: string }) => void
}) {
  const [text, setText] = React.useState("")
  const query = text.trim()
  const found = useQuery({
    queryKey: ["part-search", query],
    queryFn: () => api.listProducts({ search: query, page_length: 8 }),
    enabled: query.length >= 2,
  })
  const options = (found.data?.items ?? []).filter(
    (r) => r.is_stock_item && !exclude.includes(r.item_code)
  )
  return (
    <div className="flex flex-col gap-2">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          id="part-search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            e.preventDefault() // a scanner presses Enter: add the single match
            if (options.length === 1) {
              onPick(options[0]!)
              setText("")
            }
          }}
          placeholder="Search or scan a product to add"
        />
      </InputGroup>
      {query.length >= 2 && (
        <ul className="flex max-h-44 flex-col overflow-y-auto rounded-lg border">
          {found.isLoading && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Searching…
            </li>
          )}
          {!found.isLoading && options.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No product with its own stock matches.
            </li>
          )}
          {options.map((r) => (
            <li key={r.item_code}>
              <button
                type="button"
                onClick={() => {
                  onPick(r)
                  setText("")
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{r.item_name}</span>{" "}
                  <span className="text-muted-foreground">{r.item_code}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {formatQty(r.stock_qty)} in stock
                  <PlusIcon className="size-3.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Create a gift set (a non-stock product + its parts), or edit the parts of an existing one.
 * ERPNext's Product Bundle takes each part out of stock when a set is sold.
 */
export function GiftSetDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Given = edit this set's parts; missing = create a new set. */
  product?: ProductDetail
  onSaved: (itemCode: string) => void
}) {
  const queryClient = useQueryClient()
  const options = useQuery({
    queryKey: ["form-options"],
    queryFn: api.formOptions,
  })
  const editing = Boolean(product)
  const [name, setName] = React.useState("")
  const [code, setCode] = React.useState("")
  const [barcode, setBarcode] = React.useState("")
  const [parts, setParts] = React.useState<Part[]>([])
  const [prices, setPrices] = React.useState<Record<string, string>>({})
  // Only people who may change prices are asked for them (the server refuses otherwise).
  const canPrice = useCan("prices.edit")
  const priceLists = canPrice ? (options.data?.price_lists ?? []) : []

  const check = useFormCheck({
    gift_name: editing || name.trim() ? undefined : "Enter the gift set name.",
    gift_code: editing || code.trim() ? undefined : "Enter a product code.",
    "part-search":
      parts.length >= 2 ? undefined : "Add at least two products to the set.",
    ...Object.fromEntries(
      parts.map((p) => [
        `qty-${p.item_code}`,
        Number(p.qty) > 0 ? undefined : "Enter how many go in one set.",
      ])
    ),
    ...Object.fromEntries(
      priceLists.map((l) => [
        `gift-price-${l}`,
        isAmount(prices[l] ?? "") ? undefined : "Enter a price in rupees.",
      ])
    ),
  })

  React.useEffect(() => {
    if (!open) return
    setName("")
    setCode("")
    setBarcode("")
    setPrices({})
    setParts(
      (product?.bundle?.parts ?? []).map((p) => ({
        item_code: p.item_code,
        item_name: p.item_name,
        qty: String(p.qty_per_set),
      }))
    )
    check.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open, product?.item_code])

  const mutation = useMutation({
    mutationFn: () => {
      const clean = parts.map((p) => ({
        item_code: p.item_code,
        qty: Number(p.qty),
      }))
      return product
        ? api.updateGiftSetParts(product.item_code, clean)
        : api.createGiftSet({
            item_code: code.trim(),
            item_name: name.trim(),
            parts: clean,
            barcode: barcode.trim() || undefined,
            prices: Object.fromEntries(
              Object.entries(prices).map(([l, v]) => [
                l,
                v.trim() ? Number(v) : null,
              ])
            ),
          })
    },
    onSuccess: ({ item_code }) => {
      notifySuccess(editing ? "Parts saved" : "Gift set added", item_code)
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", item_code] })
      onOpenChange(false)
      onSaved(item_code)
    },
    onError: (e) =>
      notifyError(
        e,
        editing ? "Couldn't save the parts" : "Couldn't add the gift set"
      ),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit parts" : "New gift set"}</DialogTitle>
          <DialogDescription>
            A gift set has no stock of its own. Selling one takes each part out
            of stock.
          </DialogDescription>
        </DialogHeader>
        <form
          id="gift-set"
          noValidate
          onSubmit={(e) => check.submit(e, () => mutation.mutate())}
        >
          <FieldGroup>
            {!editing && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={check.invalid("gift_name")}>
                  <RequiredLabel htmlFor="gift_name">Name</RequiredLabel>
                  <Input
                    id="gift_name"
                    value={name}
                    aria-invalid={check.invalid("gift_name")}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Glow Trio Gift Set"
                  />
                  <FieldHint error={check.error("gift_name")} />
                </Field>
                <Field data-invalid={check.invalid("gift_code")}>
                  <RequiredLabel htmlFor="gift_code">
                    Product code (SKU)
                  </RequiredLabel>
                  <Input
                    id="gift_code"
                    value={code}
                    aria-invalid={check.invalid("gift_code")}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="GST-004"
                  />
                  <FieldHint error={check.error("gift_code")} />
                </Field>
              </div>
            )}
            <FieldSet>
              <FieldLegend variant="label">
                Parts in one set
                <span aria-hidden className="text-destructive">
                  *
                </span>
              </FieldLegend>
              <PartPicker
                exclude={parts.map((p) => p.item_code)}
                onPick={(r) =>
                  setParts([
                    ...parts,
                    {
                      item_code: r.item_code,
                      item_name: r.item_name,
                      qty: "1",
                    },
                  ])
                }
              />
              <FieldHint error={check.error("part-search")} />
              {parts.length > 0 && (
                <ul className="flex flex-col divide-y rounded-lg border">
                  {parts.map((p, i) => (
                    <li
                      key={p.item_code}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="font-medium">{p.item_name}</span>{" "}
                        <span className="text-muted-foreground">
                          {p.item_code}
                        </span>
                      </span>
                      <Input
                        id={`qty-${p.item_code}`}
                        aria-label={`How many ${p.item_name} in one set`}
                        aria-invalid={check.invalid(`qty-${p.item_code}`)}
                        inputMode="decimal"
                        value={p.qty}
                        onChange={(e) =>
                          setParts(
                            parts.map((x, j) =>
                              j === i ? { ...x, qty: e.target.value } : x
                            )
                          )
                        }
                        className="h-8 w-20 text-right tabular-nums"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${p.item_name}`}
                        onClick={() =>
                          setParts(parts.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2Icon />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </FieldSet>
            {!editing && (
              <>
                <Field>
                  <FieldLabel htmlFor="gift_barcode">Barcode</FieldLabel>
                  <Input
                    id="gift_barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value.trim())}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                    placeholder="Scan, or leave empty to create one"
                    className="font-mono"
                  />
                </Field>
                {priceLists.length > 0 && (
                  <FieldSet>
                    <FieldLegend variant="label">Price per set</FieldLegend>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {priceLists.map((l) => (
                        <Field
                          key={l}
                          data-invalid={check.invalid(`gift-price-${l}`)}
                        >
                          <FieldLabel htmlFor={`gift-price-${l}`}>
                            {l}
                          </FieldLabel>
                          <MoneyInput
                            id={`gift-price-${l}`}
                            value={prices[l] ?? ""}
                            invalid={check.invalid(`gift-price-${l}`)}
                            onChange={(v) => setPrices({ ...prices, [l]: v })}
                          />
                          <FieldHint error={check.error(`gift-price-${l}`)} />
                        </Field>
                      ))}
                    </div>
                  </FieldSet>
                )}
              </>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="gift-set" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            {editing ? "Save parts" : "Add gift set"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
