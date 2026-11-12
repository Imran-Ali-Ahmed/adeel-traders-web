"use client"

import { PlusIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { BarcodeLabel } from "@/components/products/barcode-label"
import { useCan } from "@/components/session"
import { Chip, DetailList, DetailRow } from "@/components/ui-kit/detail-list"
import { LocationRows } from "@/components/ui-kit/location-rows"
import type { ProductDetail } from "@/lib/api"
import { daysUntil, formatDate, formatQty, shortWarehouse } from "@/lib/format"

// Section bodies of the product page (app/(app)/products/[code]/page.tsx).

/** Stock by location: one bar for the whole picture, a row per location, then batches. */
export function StockBody({ product }: { product: ProductDetail }) {
  if (product.warehouses === null) {
    return (
      <p className="text-muted-foreground">
        You don't have access to stock levels.
      </p>
    )
  }
  if (product.warehouses.length === 0) {
    return (
      <p className="text-muted-foreground">
        No stock yet. It will show here once stock is received.
      </p>
    )
  }
  const selling = product.warehouses.filter((w) => w.for_sale)

  return (
    <div className="flex flex-col gap-5">
      <LocationRows
        locations={[
          ...selling,
          ...product.warehouses.filter((w) => !w.for_sale),
        ]}
      />
      {product.has_batch_no ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">Batches, oldest expiry first</h3>
          <p className="text-sm text-muted-foreground">
            Sales and transfers take stock from the batch that expires first.
          </p>
          <Table className="tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.batches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No batches in stock.
                  </TableCell>
                </TableRow>
              )}
              {product.batches.map((b) => {
                const days = daysUntil(b.expiry_date)
                return (
                  <TableRow key={`${b.batch_no}-${b.warehouse}`}>
                    <TableCell>{b.batch_no}</TableCell>
                    <TableCell>{shortWarehouse(b.warehouse)}</TableCell>
                    <TableCell className="text-right">
                      {formatQty(b.qty)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDate(b.expiry_date)}
                      {days !== null && days <= 90 && (
                        <Badge variant="destructive" className="ml-2">
                          {days < 0 ? "Expired" : `${days} days left`}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}

/** Specs on the right of the page, and the barcode picture with its print button. */
export function DetailsBody({
  product,
  onAddUnit,
}: {
  product: ProductDetail
  onAddUnit: () => void
}) {
  const canPrint = useCan("barcode.generate_print")
  const otherUnits = product.uoms.filter((u) => u.uom !== product.stock_uom)
  const barcode = product.barcodes[0]
  return (
    <div className="flex flex-col gap-5">
      {product.description ? (
        <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
          {product.description}
        </p>
      ) : null}
      <DetailList>
        <DetailRow label="Category">
          <Chip>{product.item_group}</Chip>
        </DetailRow>
        <DetailRow label="Brand">
          {product.brand ? (
            <Chip>{product.brand}</Chip>
          ) : (
            <span className="font-normal text-muted-foreground">Not set</span>
          )}
        </DetailRow>
        {product.attributes.map((a) => (
          <DetailRow key={a.attribute} label={a.attribute}>
            <Chip>{a.value}</Chip>
          </DetailRow>
        ))}
        <DetailRow label="Stock unit">{product.stock_uom}</DetailRow>
        <DetailRow label="Other units">
          {otherUnits.map((u) => (
            <Chip key={u.uom}>
              1 {u.uom} = {formatQty(u.conversion_factor)} {product.stock_uom}
            </Chip>
          ))}
          {otherUnits.length === 0 && !product.can.edit_product && (
            <span className="font-normal text-muted-foreground">None</span>
          )}
          {product.can.edit_product && (
            <button
              type="button"
              onClick={onAddUnit}
              className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <PlusIcon className="size-3.5" />
              Add unit
            </button>
          )}
        </DetailRow>
        {product.has_batch_no ? (
          <DetailRow label="Shelf life">
            {product.shelf_life_in_days
              ? `${product.shelf_life_in_days} days`
              : "Not set"}
          </DetailRow>
        ) : null}
      </DetailList>

      <div className="flex flex-col gap-3 border-t pt-4">
        <h3 className="text-sm font-medium">Barcode</h3>
        {barcode ? (
          <>
            {product.barcodes.length > 1 && (
              <p className="font-mono text-sm text-muted-foreground tabular-nums">
                Also:{" "}
                {product.barcodes
                  .slice(1)
                  .map((b) => b.barcode)
                  .join(", ")}
              </p>
            )}
            {canPrint ? (
              <BarcodeLabel
                code={barcode.barcode}
                name={product.item_name}
                price={
                  product.prices.find((p) => p.price_list === "Online")?.rate ??
                  null
                }
              />
            ) : (
              <p className="font-mono text-sm tabular-nums">
                {barcode.barcode}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No barcode yet. Use the ⋯ menu, then Generate barcode.
          </p>
        )}
      </div>
    </div>
  )
}
