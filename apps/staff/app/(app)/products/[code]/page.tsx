"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  ArrowRightLeftIcon,
  BarcodeIcon,
  BellRingIcon,
  BoxesIcon,
  EllipsisIcon,
  PackageCheckIcon,
  PackageSearchIcon,
  PaletteIcon,
  PencilIcon,
  TriangleAlertIcon,
  WalletIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { AddVariantDialog } from "@/components/products/add-variant-dialog"
import { AddUnitDialog } from "@/components/products/add-unit-dialog"
import { ProductPhoto } from "@/components/products/product-photo"
import { StockHistory } from "@/components/products/stock-history"
import { HistoryPanel } from "@/components/ui-kit/history-panel"
import { EditProductDialog } from "@/components/products/edit-product-dialog"
import { GiftSetDialog } from "@/components/products/gift-set-dialog"
import { DetailsBody, StockBody } from "@/components/products/product-parts"
import {
  StockActionDialog,
  type StockAction,
} from "@/components/products/stock-action-dialog"
import { BottleneckList } from "@/components/ui-kit/bottleneck-list"
import { PriceGrid } from "@/components/ui-kit/price-grid"
import { ReorderGauge } from "@/components/ui-kit/reorder-gauge"
import { StatCard } from "@/components/ui-kit/stat-card"
import { StatusPill } from "@/components/ui-kit/status-pill"
import { StockBar } from "@/components/ui-kit/stock-bar"
import { api, type ProductDetail } from "@/lib/api"
import { formatQty, formatRs } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

function useGenerateBarcode(itemCode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.generateBarcode(itemCode),
    onSuccess: (code) => {
      notifySuccess("Barcode added", code)
      queryClient.invalidateQueries({ queryKey: ["product", itemCode] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (e) => notifyError(e, "Couldn't add barcode"),
  })
}

function ProductHeader({
  product,
  onEdit,
  onMove,
  onAdjust,
  onAddShade,
}: {
  product: ProductDetail
  onEdit: () => void
  onMove: () => void
  onAdjust: () => void
  onAddShade: () => void
}) {
  const generateBarcode = useGenerateBarcode(product.item_code)
  const hasMore =
    product.can.move_stock ||
    product.can.add_shade ||
    product.can.generate_barcode

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5">
      <div className="flex min-w-0 items-center gap-4">
        <ProductPhoto product={product} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">
            {product.item_name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <span>
              {product.item_code} · {product.item_group}
              {product.brand ? ` · ${product.brand}` : ""}
            </span>
            <StatusPill status={product.status} />
            {product.attributes.map((a) => (
              <span
                key={a.attribute}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/80"
              >
                {a.attribute}: {a.value}
              </span>
            ))}
            {product.has_batch_no ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/80">
                Tracks expiry
              </span>
            ) : null}
            {product.disabled ? (
              <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                Inactive
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {product.can.edit_product && (
          <Button variant="outline" onClick={onEdit}>
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
        )}
        {product.can.move_stock && (
          <Button onClick={onMove}>
            <ArrowRightLeftIcon data-icon="inline-start" />
            Move stock
          </Button>
        )}
        {hasMore && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="More actions"
                />
              }
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                {product.can.move_stock && (
                  <DropdownMenuItem onClick={onAdjust}>
                    <TriangleAlertIcon />
                    Damaged, tester or lost
                  </DropdownMenuItem>
                )}
                {product.can.add_shade && (
                  <DropdownMenuItem onClick={onAddShade}>
                    <PaletteIcon />
                    Add variant
                  </DropdownMenuItem>
                )}
                {product.can.generate_barcode && (
                  <DropdownMenuItem
                    onClick={() => generateBarcode.mutate()}
                    disabled={generateBarcode.isPending}
                  >
                    <BarcodeIcon />
                    Generate barcode
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

function ProductStats({
  product,
  onEdit,
}: {
  product: ProductDetail
  onEdit: () => void
}) {
  if (!product.is_stock_item) return <SetStats product={product} />

  const selling = (product.warehouses ?? []).filter((w) => w.for_sale)
  const sellable = selling.reduce((sum, w) => sum + w.qty, 0)
  const held = selling.reduce((sum, w) => sum + w.reserved, 0)
  const notForSale = (product.warehouses ?? [])
    .filter((w) => !w.for_sale)
    .reduce((sum, w) => sum + w.qty, 0)
  const level = product.reorder_main.level
  const low =
    product.status === "low_stock" || product.status === "out_of_stock"

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <StatCard
        icon={BoxesIcon}
        tone={1}
        label="Available to sell"
        value={`${formatQty(sellable)} ${product.stock_uom}`}
        caption={
          notForSale > 0
            ? `${formatQty(product.physical_qty)} physically here`
            : undefined
        }
        emphasis={product.status === "out_of_stock" ? "destructive" : undefined}
        visual={
          <StockBar
            free={sellable - held}
            held={held}
            notForSale={notForSale}
          />
        }
      />
      <StatCard
        className="sm:col-span-2"
        icon={BellRingIcon}
        tone={3}
        label="Reorder"
        value={
          !level
            ? "Not set"
            : low
              ? `Need ${formatQty(level - sellable)} more`
              : "Stock is healthy"
        }
        emphasis={level && low ? "warning" : undefined}
        visual={
          <ReorderGauge
            onHand={sellable}
            level={level}
            orderQty={product.reorder_main.qty}
            action={
              product.can.edit_product ? (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {level ? "Change level" : "Set reorder level"}
                </button>
              ) : null
            }
          />
        }
      />
      <StatCard
        icon={WalletIcon}
        tone={4}
        label="Average cost"
        value={product.can.view_cost ? formatRs(product.cost) : "Hidden"}
        caption={
          product.can.view_cost ? (
            <>
              Per {product.stock_uom} ·{" "}
              <span className="whitespace-nowrap">
                {formatRs(product.stock_value)} sellable
              </span>
              {(product.not_for_sale_value ?? 0) > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="whitespace-nowrap">
                    {formatRs(product.not_for_sale_value)} not for sale
                  </span>
                </>
              )}
            </>
          ) : (
            "Managers only"
          )
        }
      />
    </div>
  )
}

/** Gift set: how many sets can be packed, and why not if the answer is 0. */
function SetStats({ product }: { product: ProductDetail }) {
  const bundle = product.bundle
  const sets = bundle?.sets_available ?? 0
  const blocked = bundle?.blocked_by
  const limiting = bundle?.parts.find((p) => p.limiting)
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        className="sm:col-span-2"
        icon={PackageCheckIcon}
        tone={1}
        label="Sets you can pack"
        value={formatQty(sets)}
        emphasis={sets === 0 ? "destructive" : undefined}
        caption={
          blocked?.type === "part_out_of_stock"
            ? `Blocked by ${blocked.item_name} (${formatQty(blocked.in_stock)} in stock).`
            : blocked?.type === "parts_in_different_locations"
              ? "Every part is in stock, but not in the same location."
              : limiting
                ? `Limited by ${limiting.item_name}.`
                : "This set has no parts yet."
        }
      />
      <StatCard
        icon={WalletIcon}
        tone={4}
        label="Cost of one set"
        value={
          !product.can.view_cost
            ? "Hidden"
            : product.cost === null
              ? "Not set"
              : formatRs(product.cost)
        }
        caption={
          !product.can.view_cost
            ? "Managers only"
            : product.cost === null
              ? "A part has no cost yet."
              : "Sum of its parts' costs"
        }
      />
    </div>
  )
}

function ProductPageInner() {
  const { code } = useParams<{ code: string }>()
  const itemCode = decodeURIComponent(code)
  const router = useRouter()
  const search = useSearchParams()
  const product = useQuery({
    queryKey: ["product", itemCode],
    queryFn: () => api.getProduct(itemCode),
    retry: false,
  })
  const p = product.data

  const [action, setAction] = React.useState<StockAction | null>(null)
  const [editing, setEditing] = React.useState(false)
  const [addingShade, setAddingShade] = React.useState(false)
  const [addingUnit, setAddingUnit] = React.useState(false)
  const [editingParts, setEditingParts] = React.useState(false)

  // A row's menu on the list opens this page with ?do=transfer|adjust.
  const requested = search.get("do")
  React.useEffect(() => {
    if (!p || !requested) return
    if (requested === "transfer" || requested === "adjust") {
      if (p.can.move_stock) setAction(requested)
    }
    router.replace(`/products/${encodeURIComponent(itemCode)}`)
  }, [p, requested, router, itemCode])

  if (product.isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (product.error || !p) {
    return (
      <div className="p-4 md:p-8">
        <Empty className="py-24">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageSearchIcon />
            </EmptyMedia>
            <EmptyTitle>Product not found</EmptyTitle>
            <EmptyDescription>
              {product.error?.message ??
                "It may have been removed, or you may not have access."}
            </EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/products" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back to products
          </Button>
        </Empty>
      </div>
    )
  }

  const isBundle = !p.is_stock_item
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <Link
        href="/products"
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:hidden"
      >
        <ArrowLeftIcon className="size-4" />
        Products & stock
      </Link>

      <ProductHeader
        product={p}
        onEdit={() => setEditing(true)}
        onMove={() => setAction("transfer")}
        onAdjust={() => setAction("adjust")}
        onAddShade={() => setAddingShade(true)}
      />
      <ProductStats product={p} onEdit={() => setEditing(true)} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {isBundle ? (
            <Section
              title="Parts in this set"
              description="A gift set has no stock of its own. Selling one takes these parts out of stock."
              action={
                p.can.edit_product ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingParts(true)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Edit parts
                  </Button>
                ) : null
              }
            >
              {p.bundle ? (
                <BottleneckList parts={p.bundle.parts} />
              ) : (
                <p className="text-muted-foreground">
                  This product has no parts set up.
                </p>
              )}
            </Section>
          ) : (
            <Section title="Stock by location">
              <StockBody product={p} />
            </Section>
          )}
          <Section
            title="Prices"
            description={
              p.can.edit_prices
                ? "Click a price to change it. It saves when you leave the field."
                : undefined
            }
          >
            <PriceGrid product={p} />
          </Section>
          {!isBundle && (
            <Section
              title="Stock history"
              description="Every movement in and out, newest first."
            >
              <StockHistory itemCode={p.item_code} />
            </Section>
          )}
          <Section
            title="Change history"
            description="Who changed the details and prices, and when."
          >
            <HistoryPanel doctype="Item" name={p.item_code} />
          </Section>
        </div>
        <div className="lg:sticky lg:top-24">
          <Section title="Details">
            <DetailsBody product={p} onAddUnit={() => setAddingUnit(true)} />
          </Section>
        </div>
      </div>

      <StockActionDialog
        action={action}
        product={p}
        onOpenChange={(open) => !open && setAction(null)}
      />
      <EditProductDialog product={p} open={editing} onOpenChange={setEditing} />
      <AddVariantDialog
        product={p}
        open={addingShade}
        onOpenChange={setAddingShade}
        onCreated={(code) =>
          router.push(`/products/${encodeURIComponent(code)}`)
        }
      />
      {isBundle && (
        <GiftSetDialog
          product={p}
          open={editingParts}
          onOpenChange={setEditingParts}
          onSaved={() => undefined}
        />
      )}
      <AddUnitDialog
        product={p}
        open={addingUnit}
        onOpenChange={setAddingUnit}
      />
    </div>
  )
}

export default function ProductPage() {
  return (
    <React.Suspense>
      <ProductPageInner />
    </React.Suspense>
  )
}
