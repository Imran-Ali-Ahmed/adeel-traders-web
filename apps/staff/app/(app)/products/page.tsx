"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  AlertTriangleIcon,
  ArrowRightLeftIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  GiftIcon,
  PackageSearchIcon,
  PlusIcon,
  XIcon,
  ScanBarcodeIcon,
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import {
  HealthBar,
  HeroCard,
  ProductThumb,
  StockMeter,
} from "@/components/products/bits"
import { PriceWithMargin } from "@/components/products/margin"
import { GiftSetDialog } from "@/components/products/gift-set-dialog"
import { NewProductDialog } from "@/components/products/new-product-dialog"
import { useCan } from "@/components/session"
import { RestockCard } from "@/components/products/restock-card"
import { ExportButton } from "@/components/ui-kit/export-button"
import { ExpiringPill, StatusPill } from "@/components/ui-kit/status-pill"
import {
  PRODUCTS_COMMAND_EVENT,
  takeUrlCommand,
  type ProductsCommand,
} from "@/lib/commands"
import { api, type ProductSort, type StatusFilter } from "@/lib/api"
import { formatQty, formatRs, shortWarehouse } from "@/lib/format"

const PAGE = 25
const ALL_GROUPS = "__all__"

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "expiring", label: "Expiring soon" },
]

// What each tab means, shown as a tooltip.
const TAB_HELP: Partial<Record<StatusFilter, string>> = {
  all: "Every product, including gift sets",
  in_stock: "Sellable stock above the reorder level (or no level set)",
  low_stock: "Sellable stock at or below the reorder level, but not zero",
  out_of_stock: "No sellable stock. Damaged and tester units don't count.",
  expiring: "Has a batch that expires within 90 days",
}

const SORTS: Record<ProductSort, string> = {
  name: "Name, A to Z",
  stock_low: "Stock, lowest first",
  stock_high: "Stock, highest first",
  newest: "Newest first",
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

/** Page numbers with gaps: 1 … 4 5 6 … 10 */
function pageList(current: number, last: number): (number | "gap")[] {
  const pages = new Set(
    [0, last, current - 1, current, current + 1].filter(
      (p) => p >= 0 && p <= last
    )
  )
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | "gap")[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("gap")
    out.push(p)
  })
  return out
}

export default function ProductsPage() {
  const canEdit = useCan("products.create")
  const [search, setSearch] = React.useState("")
  const [group, setGroup] = React.useState(ALL_GROUPS)
  const [brand, setBrand] = React.useState(ALL_GROUPS)
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [sort, setSort] = React.useState<ProductSort>("name")
  const [page, setPage] = React.useState(0)
  const router = useRouter()
  // A product opens on its own page: /products/CODE (optionally ?do=transfer|adjust).
  const openProduct = React.useCallback(
    (code: string, action?: "transfer" | "adjust") =>
      router.push(
        `/products/${encodeURIComponent(code)}${action ? `?do=${action}` : ""}`
      ),
    [router]
  )
  const [creating, setCreating] = React.useState(false)
  const [creatingSet, setCreatingSet] = React.useState(false)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const query = useDebounced(search.trim(), 250)

  // Commands from the top-bar palette: search for something, or start a new product.
  React.useEffect(() => {
    function run(command: ProductsCommand) {
      if (command.search !== undefined) {
        setSearch(command.search)
        setStatus("all")
        setGroup(ALL_GROUPS)
        searchRef.current?.focus()
      }
      if (command.create) setCreating(true)
    }
    const fromUrl = takeUrlCommand()
    if (fromUrl) run(fromUrl)
    const onEvent = (event: Event) =>
      run((event as CustomEvent<ProductsCommand>).detail)
    window.addEventListener(PRODUCTS_COMMAND_EVENT, onEvent)
    return () => window.removeEventListener(PRODUCTS_COMMAND_EVENT, onEvent)
  }, [])

  const filters = {
    search: query,
    item_group: group === ALL_GROUPS ? undefined : group,
    brand: brand === ALL_GROUPS ? undefined : brand,
    status,
    sort,
  }
  const options = useQuery({
    queryKey: ["form-options"],
    queryFn: api.formOptions,
  })
  const products = useQuery({
    queryKey: ["products", filters, page],
    queryFn: () =>
      api.listProducts({ ...filters, start: page * PAGE, page_length: PAGE }),
    placeholderData: keepPreviousData,
  })

  React.useEffect(() => setPage(0), [query, group, brand, status, sort])

  // A barcode scanner types the code and presses Enter: open that product directly.
  function onScanEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return
    const items = products.data?.items ?? []
    if (items.length === 1) {
      openProduct(items[0]!.item_code)
      setSearch("")
    }
  }

  const data = products.data
  const showCost = data?.can_view_cost ?? false
  const priceLists = options.data?.price_lists ?? [
    "Wholesale",
    "Online",
    "Self-delivery",
  ]
  const lastPage = data ? Math.max(0, Math.ceil(data.total / PAGE) - 1) : 0
  const counts = data?.counts
  const summary = data?.summary
  // Gift sets have no stock of their own, so they appear in no status tab.
  const giftSets = counts
    ? counts.all - counts.in_stock - counts.low_stock - counts.out_of_stock
    : 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Products & stock
          </h1>
          <p className="text-muted-foreground">
            Prices for every channel and stock in every location, in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton what="products" filters={filters} size="lg" />
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCreatingSet(true)}
              >
                <GiftIcon data-icon="inline-start" />
                New gift set
              </Button>
              <Button size="lg" onClick={() => setCreating(true)}>
                <PlusIcon data-icon="inline-start" />
                New product
              </Button>
            </>
          )}
        </div>
      </div>

      {summary && counts ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <HeroCard
              label={
                showCost ? "Sellable stock at cost" : "Units available to sell"
              }
              value={
                showCost
                  ? formatRs(summary.stock_value)
                  : formatQty(summary.units)
              }
              caption={
                <>
                  {formatQty(summary.units)} units across{" "}
                  {summary.locations ?? 0}{" "}
                  {summary.locations === 1 ? "location" : "locations"}
                  {(summary.not_for_sale_units ?? 0) > 0 && (
                    <span className="block text-white/60">
                      Not counted: {formatQty(summary.not_for_sale_units)}{" "}
                      damaged or tester units
                      {summary.not_for_sale_value
                        ? ` (${formatRs(summary.not_for_sale_value)})`
                        : ""}
                    </span>
                  )}
                </>
              }
            >
              <HealthBar
                inStock={counts.in_stock}
                low={counts.low_stock}
                out={counts.out_of_stock}
              />
              {showCost &&
                (summary.by_location ?? []).some((l) => l.for_sale) && (
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
                    {(summary.by_location ?? [])
                      .filter((l) => l.for_sale)
                      .slice(0, 3)
                      .map((l) => (
                        <span key={l.warehouse}>
                          {shortWarehouse(l.warehouse)}{" "}
                          <span className="font-semibold text-white tabular-nums">
                            {formatRs(l.value)}
                          </span>
                        </span>
                      ))}
                  </p>
                )}
            </HeroCard>
          </div>
          <RestockCard
            className="lg:col-span-7"
            restock={data.restock}
            expiring={counts.expiring}
            onShowAll={() => setStatus("restock")}
            onShowExpiring={() => setStatus("expiring")}
            onShowOutOfStock={() => setStatus("out_of_stock")}
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-52 rounded-xl lg:col-span-5" />
          <Skeleton className="h-52 rounded-xl lg:col-span-7" />
        </div>
      )}

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg font-semibold">Product list</h2>
            {status === "restock" && (
              <button
                type="button"
                onClick={() => setStatus("all")}
                className="flex items-center gap-1.5 rounded-md bg-warning/15 px-2 py-1 text-xs font-semibold text-warning focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label="Clear the needs restocking filter"
              >
                Needs restocking
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
          <div
            className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
            role="tablist"
            aria-label="Filter by status"
          >
            {TABS.map((tab) => (
              <button
                key={tab.value}
                role="tab"
                aria-selected={status === tab.value}
                onClick={() => setStatus(tab.value)}
                title={TAB_HELP[tab.value]}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
                  status === tab.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    status === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  )}
                >
                  {counts ? counts[tab.value] : "–"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <InputGroup className="h-10 min-w-64 flex-1 rounded-lg bg-background">
            <InputGroupAddon>
              <ScanBarcodeIcon />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onScanEnter}
              placeholder="Scan a barcode, or search by name or code"
              aria-label="Scan a barcode, or search by name or code"
            />
          </InputGroup>
          <Select
            value={group}
            onValueChange={(value) => setGroup(value ?? ALL_GROUPS)}
            items={{
              [ALL_GROUPS]: "All categories",
              ...Object.fromEntries(
                (options.data?.item_groups ?? []).map((g) => [g, g])
              ),
            }}
          >
            <SelectTrigger
              aria-label="Category"
              className="h-10! min-w-44 rounded-lg"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_GROUPS}>All categories</SelectItem>
                {(options.data?.item_groups ?? []).map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {(options.data?.brands ?? []).length > 0 && (
            <Select
              value={brand}
              onValueChange={(value) => setBrand(value ?? ALL_GROUPS)}
              items={{
                [ALL_GROUPS]: "All brands",
                ...Object.fromEntries(
                  (options.data?.brands ?? []).map((b) => [b, b])
                ),
              }}
            >
              <SelectTrigger
                aria-label="Brand"
                className="h-10! min-w-40 rounded-lg"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL_GROUPS}>All brands</SelectItem>
                  {(options.data?.brands ?? []).map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <Select
            value={sort}
            onValueChange={(value) => setSort((value as ProductSort) ?? "name")}
            items={SORTS}
          >
            <SelectTrigger
              aria-label="Sort by"
              className="h-10! min-w-48 rounded-lg"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(Object.keys(SORTS) as ProductSort[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORTS[key]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <Table className="tabular-nums">
          <TableHeader className="bg-muted/60 [&_th]:h-11 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground">
            <TableRow>
              <TableHead className="pl-5">Product</TableHead>
              <TableHead className="max-lg:hidden">Barcode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">In stock</TableHead>
              {showCost && (
                <TableHead className="text-right max-md:hidden">Cost</TableHead>
              )}
              {priceLists.map((pl) => (
                <TableHead key={pl} className="text-right max-md:hidden">
                  {pl}
                </TableHead>
              ))}
              <TableHead className="w-12 pr-5">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9} className="px-5">
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.items.map((row) => (
              <TableRow
                key={row.item_code}
                className="cursor-pointer [&_td]:py-2.5"
                onClick={() => openProduct(row.item_code)}
              >
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      name={row.item_name}
                      group={row.item_group}
                      image={row.image}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold text-foreground">
                        {row.item_name}
                      </span>
                      <span className="flex gap-3 text-xs text-muted-foreground">
                        <span>{row.item_code}</span>
                        <span>{row.item_group}</span>
                        {row.brand && <span>{row.brand}</span>}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground tabular-nums max-lg:hidden">
                  {row.barcode ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill status={row.status} />
                    {row.expiring && <ExpiringPill />}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold">
                      {!row.is_stock_item
                        ? row.bundle_available === null
                          ? "—"
                          : `${formatQty(row.bundle_available)} sets`
                        : row.stock_qty === null
                          ? "—"
                          : formatQty(row.stock_qty)}
                    </span>
                    {!row.is_stock_item && row.bundle_available === 0 ? (
                      <span className="text-xs text-destructive">
                        Can&apos;t pack yet
                      </span>
                    ) : null}
                    {row.is_stock_item && row.stock_qty !== null ? (
                      <span className="text-xs text-muted-foreground">
                        {row.reorder_level
                          ? `Reorder at ${formatQty(row.reorder_level)}`
                          : row.stock_uom}
                      </span>
                    ) : null}
                    {row.is_stock_item && row.stock_qty !== null ? (
                      <StockMeter
                        qty={row.stock_qty}
                        reorderLevel={row.reorder_level}
                      />
                    ) : null}
                  </div>
                </TableCell>
                {showCost && (
                  <TableCell className="text-right max-md:hidden">
                    {row.cost === null ? (
                      <span
                        className="cursor-help text-muted-foreground"
                        title={
                          row.is_stock_item
                            ? "No cost yet. It is set when stock is received with a cost."
                            : "No cost yet. A part of this set has no cost."
                        }
                      >
                        —
                      </span>
                    ) : (
                      formatRs(row.cost)
                    )}
                  </TableCell>
                )}
                {row.prices.map((p) => (
                  <TableCell
                    key={p.price_list}
                    className="text-right max-md:hidden"
                  >
                    <PriceWithMargin rate={p.rate} margin={p.margin} />
                  </TableCell>
                ))}
                <TableCell
                  className="pr-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${row.item_name}`}
                        />
                      }
                    >
                      <EllipsisVerticalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-56">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => openProduct(row.item_code)}
                        >
                          <EyeIcon />
                          View details
                        </DropdownMenuItem>
                        {row.is_stock_item ? (
                          <>
                            <DropdownMenuItem
                              onClick={() =>
                                openProduct(row.item_code, "transfer")
                              }
                            >
                              <ArrowRightLeftIcon />
                              Move stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                openProduct(row.item_code, "adjust")
                              }
                            >
                              <AlertTriangleIcon />
                              Damaged, tester or lost
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data && data.items.length === 0 && (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageSearchIcon />
              </EmptyMedia>
              <EmptyTitle>No products here</EmptyTitle>
              <EmptyDescription>
                {query
                  ? `Nothing matches "${query}". Check the barcode or try another name.`
                  : status !== "all"
                    ? "No products are in this state right now."
                    : "Add your first product to start tracking stock."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {products.error && (
          <p className="p-6 text-destructive">{products.error.message}</p>
        )}

        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE + 1} to{" "}
              {Math.min((page + 1) * PAGE, data.total)} of {data.total}
              {status === "all" && giftSets > 0 && (
                <span>
                  {" "}
                  · {giftSets}{" "}
                  {giftSets === 1 ? "gift set has" : "gift sets have"} no stock
                  status of {giftSets === 1 ? "its" : "their"} own
                </span>
              )}
            </p>
            {lastPage > 0 && (
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={page === 0}
                      className={cn(
                        page === 0 && "pointer-events-none opacity-50"
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.max(0, p - 1))
                      }}
                    />
                  </PaginationItem>
                  {pageList(page, lastPage).map((p, i) =>
                    p === "gap" ? (
                      <PaginationItem key={`gap-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault()
                            setPage(p)
                          }}
                        >
                          {p + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={page >= lastPage}
                      className={cn(
                        page >= lastPage && "pointer-events-none opacity-50"
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.min(lastPage, p + 1))
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </section>

      <GiftSetDialog
        open={creatingSet}
        onOpenChange={setCreatingSet}
        onSaved={(code) => openProduct(code)}
      />
      <NewProductDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(code) => openProduct(code)}
      />
    </div>
  )
}
