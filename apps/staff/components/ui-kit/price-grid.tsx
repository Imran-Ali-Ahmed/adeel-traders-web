"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { BikeIcon, GlobeIcon, StoreIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { MarginPill } from "@/components/ui-kit/margin-pill"
import { api, type ProductDetail } from "@/lib/api"
import { formatQty, formatRs } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

const CHANNEL_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Wholesale: StoreIcon,
  Online: GlobeIcon,
  "Self-delivery": BikeIcon,
}

/** One price. Empty means "not set" (never 0). Saves when you leave the field. */
function PriceInput({
  product,
  priceList,
  uom,
  rate,
}: {
  product: ProductDetail
  priceList: string
  uom: string
  rate: number | null
}) {
  const queryClient = useQueryClient()
  const [value, setValue] = React.useState(rate === null ? "" : String(rate))
  React.useEffect(() => setValue(rate === null ? "" : String(rate)), [rate])

  const mutation = useMutation({
    mutationFn: (next: number) =>
      api.setPrice({
        item_code: product.item_code,
        price_list: priceList,
        rate: next,
        uom,
      }),
    onSuccess: () => {
      notifySuccess(`${priceList} price saved`)
      queryClient.invalidateQueries({
        queryKey: ["product", product.item_code],
      })
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e) => {
      notifyError(e)
      setValue(rate === null ? "" : String(rate)) // put the old price back
    },
  })

  function save() {
    const next = Number(value)
    if (
      value.trim() === "" ||
      Number.isNaN(next) ||
      next < 0 ||
      next === rate
    ) {
      if (value.trim() === "") setValue(rate === null ? "" : String(rate))
      return
    }
    mutation.mutate(next)
  }

  return (
    <div className="flex items-center gap-2">
      {mutation.isPending && <Spinner />}
      <div className="flex h-9 items-center rounded-lg border border-input bg-card transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1">
        <span className="pl-2.5 text-sm text-muted-foreground">Rs</span>
        <Input
          aria-label={`${priceList} price per ${uom}`}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="Set price"
          className="h-8 w-24 border-0 bg-transparent px-2 text-right font-medium tabular-nums shadow-none placeholder:font-normal focus-visible:ring-0 dark:bg-transparent"
        />
      </div>
    </div>
  )
}

/**
 * Prices in one table: a row per sales channel, a column per unit (Piece, Box...).
 * Each cell is the price with its margin beside it.
 */
export function PriceGrid({ product }: { product: ProductDetail }) {
  const units = [
    { uom: product.stock_uom, factor: 1 },
    ...product.uoms
      .filter((u) => u.uom !== product.stock_uom)
      .map((u) => ({ uom: u.uom, factor: u.conversion_factor })),
  ]
  const canEdit = product.can.edit_prices
  const cost = product.cost

  function cell(priceList: string, uom: string) {
    if (uom === product.stock_uom) {
      const p = product.prices.find((x) => x.price_list === priceList)
      return {
        rate: p?.rate ?? null,
        margin: p?.margin ?? null,
        perPiece: p?.rate ?? null,
        discount: null as number | null,
      }
    }
    const u = product.unit_prices.find(
      (x) => x.price_list === priceList && x.uom === uom
    )
    return {
      rate: u?.rate ?? null,
      margin: u?.margin ?? null,
      perPiece: u?.per_piece ?? null,
      discount: u?.discount ?? null,
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table
          className={cn("w-full text-sm", units.length === 1 && "max-w-md")}
        >
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Channel</th>
              {units.map((u) => (
                <th
                  key={u.uom}
                  className="pb-2 pl-4 text-right font-medium whitespace-nowrap"
                >
                  {u.uom}
                  {u.factor !== 1 && (
                    <span className="block font-normal">
                      = {formatQty(u.factor)} {product.stock_uom}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {product.prices.map((price) => {
              const Icon = CHANNEL_ICONS[price.price_list]
              return (
                <tr key={price.price_list}>
                  <td className="py-2.5 pr-4 align-top font-medium whitespace-nowrap">
                    <span className="flex h-9 items-center gap-2">
                      {Icon && (
                        <Icon className="size-4 text-muted-foreground" />
                      )}
                      {price.price_list}
                    </span>
                  </td>
                  {units.map((u) => {
                    const c = cell(price.price_list, u.uom)
                    const profit =
                      cost !== null && c.perPiece !== null
                        ? Math.round((c.perPiece - cost) * u.factor)
                        : null
                    return (
                      <td key={u.uom} className="py-2.5 pl-4 align-top">
                        <div className="flex items-start justify-end gap-3">
                          <MarginPill
                            margin={c.margin}
                            profit={profit}
                            className="h-9 max-sm:hidden"
                          />
                          <div className="flex flex-col items-end gap-0.5">
                            {canEdit ? (
                              <PriceInput
                                product={product}
                                priceList={price.price_list}
                                uom={u.uom}
                                rate={c.rate}
                              />
                            ) : (
                              <span
                                className={cn(
                                  "w-28 text-right tabular-nums",
                                  c.rate === null && "text-muted-foreground"
                                )}
                              >
                                {c.rate === null ? "—" : formatRs(c.rate)}
                              </span>
                            )}

                            {u.uom !== product.stock_uom && (
                              <span className="h-4 text-xs text-muted-foreground tabular-nums">
                                {c.rate !== null && c.perPiece !== null && (
                                  <>
                                    {formatRs(c.perPiece)} each
                                    {c.discount !== null && c.discount !== 0
                                      ? c.discount > 0
                                        ? `, ${c.discount}% less`
                                        : `, ${Math.abs(c.discount)}% more`
                                      : ""}
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!canEdit && (
        <p className="text-sm text-muted-foreground">
          Only managers can change prices.
        </p>
      )}
      {canEdit && cost === null && product.can.view_cost && (
        <p className="text-sm text-muted-foreground">
          {product.is_stock_item
            ? "Cost not set. Margin appears once this product has stock with a cost."
            : "Cost not set. A part of this set has no cost yet, so margin can't be shown."}
        </p>
      )}
    </div>
  )
}
