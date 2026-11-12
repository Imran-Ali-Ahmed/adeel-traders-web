"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ScanBarcodeIcon } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"

import { useCan } from "@/components/session"
import { BrandSelect } from "@/components/ui-kit/brand-select"
import {
  FieldHint,
  isAmount,
  MoneyInput,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { api } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

const EMPTY = {
  item_code: "",
  item_name: "",
  item_group: "",
  barcode: "",
  brand: null as string | null,
  description: "",
  stock_uom: "Piece",
  has_batch_no: false,
  shelf_life_in_days: "",
}

export function NewProductDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (itemCode: string) => void
}) {
  const queryClient = useQueryClient()
  const options = useQuery({
    queryKey: ["form-options"],
    queryFn: api.formOptions,
  })
  const [form, setForm] = React.useState(EMPTY)
  const [prices, setPrices] = React.useState<Record<string, string>>({})
  // Only people who may change prices are asked for them (the server refuses otherwise).
  const canPrice = useCan("prices.edit")
  const priceLists = canPrice ? (options.data?.price_lists ?? []) : []

  const check = useFormCheck({
    item_name: form.item_name.trim() ? undefined : "Enter the product name.",
    item_code: form.item_code.trim() ? undefined : "Enter a product code.",
    item_group: form.item_group ? undefined : "Choose a category.",
    shelf_life:
      form.has_batch_no &&
      form.shelf_life_in_days.trim() !== "" &&
      !(Number(form.shelf_life_in_days) > 0)
        ? "Enter the number of days, or leave it empty."
        : undefined,
    ...Object.fromEntries(
      priceLists.map((list) => [
        `price-${list}`,
        isAmount(prices[list] ?? "") ? undefined : "Enter a price in rupees.",
      ])
    ),
  })

  React.useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setPrices({})
      check.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open])

  const mutation = useMutation({
    mutationFn: () =>
      api.createProduct({
        ...form,
        shelf_life_in_days: Number(form.shelf_life_in_days) || 0,
        prices: Object.fromEntries(
          Object.entries(prices).map(([list, value]) => [
            list,
            value.trim() ? Number(value) : null,
          ])
        ),
      }),
    onSuccess: ({ item_code }) => {
      notifySuccess("Product added", item_code)
      queryClient.invalidateQueries({ queryKey: ["products"] })
      onOpenChange(false)
      onCreated(item_code)
    },
    onError: (e) => notifyError(e, "Couldn't add the product"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <DialogDescription>
            Add a single product. For a new shade of an existing product, open
            that product and choose Add shade.
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-product"
          noValidate
          onSubmit={(e) => check.submit(e, () => mutation.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("item_name")}>
              <RequiredLabel htmlFor="item_name">Name</RequiredLabel>
              <Input
                id="item_name"
                value={form.item_name}
                aria-invalid={check.invalid("item_name")}
                onChange={(e) =>
                  setForm({ ...form, item_name: e.target.value })
                }
                placeholder="Rose Water Toner 200 ml"
              />
              <FieldHint error={check.error("item_name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={check.invalid("item_code")}>
                <RequiredLabel htmlFor="item_code">
                  Product code (SKU)
                </RequiredLabel>
                <Input
                  id="item_code"
                  value={form.item_code}
                  aria-invalid={check.invalid("item_code")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      item_code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="RWT-200"
                />
                <FieldHint error={check.error("item_code")} />
              </Field>
              <Field data-invalid={check.invalid("item_group")}>
                <RequiredLabel htmlFor="item_group">Category</RequiredLabel>
                <Select
                  value={form.item_group || null}
                  onValueChange={(v) =>
                    setForm({ ...form, item_group: v ?? "" })
                  }
                >
                  <SelectTrigger
                    id="item_group"
                    className="w-full"
                    aria-invalid={check.invalid("item_group")}
                  >
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(options.data?.item_groups ?? []).map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldHint error={check.error("item_group")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="brand">Brand</FieldLabel>
                <BrandSelect
                  id="brand"
                  value={form.brand}
                  onChange={(brand) => setForm({ ...form, brand })}
                  brands={options.data?.brands ?? []}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="barcode">Barcode</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <ScanBarcodeIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) =>
                    setForm({ ...form, barcode: e.target.value.trim() })
                  }
                  onKeyDown={(e) => {
                    // A scanner types the code and presses Enter: don't submit the form.
                    if (e.key === "Enter") e.preventDefault()
                  }}
                  placeholder="Scan the barcode on the box"
                  className="font-mono"
                />
              </InputGroup>
              <FieldHint hint="Leave empty and the app creates one you can print." />
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="has_batch_no"
                checked={form.has_batch_no}
                onCheckedChange={(checked) =>
                  setForm({ ...form, has_batch_no: Boolean(checked) })
                }
              />
              <FieldLabel htmlFor="has_batch_no">
                Track batches and expiry dates
              </FieldLabel>
            </Field>
            {form.has_batch_no && (
              <Field data-invalid={check.invalid("shelf_life")}>
                <FieldLabel htmlFor="shelf_life">Shelf life (days)</FieldLabel>
                <Input
                  id="shelf_life"
                  inputMode="numeric"
                  value={form.shelf_life_in_days}
                  aria-invalid={check.invalid("shelf_life")}
                  onChange={(e) =>
                    setForm({ ...form, shelf_life_in_days: e.target.value })
                  }
                  placeholder="730"
                />
                <FieldHint
                  error={check.error("shelf_life")}
                  hint="Used to set the expiry date when stock arrives."
                />
              </Field>
            )}
            {priceLists.length > 0 && (
              <FieldSet>
                <FieldLegend variant="label">Price per piece</FieldLegend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {priceLists.map((list) => (
                    <Field
                      key={list}
                      data-invalid={check.invalid(`price-${list}`)}
                    >
                      <FieldLabel htmlFor={`price-${list}`}>{list}</FieldLabel>
                      <MoneyInput
                        id={`price-${list}`}
                        value={prices[list] ?? ""}
                        invalid={check.invalid(`price-${list}`)}
                        onChange={(value) =>
                          setPrices({ ...prices, [list]: value })
                        }
                      />
                      <FieldHint error={check.error(`price-${list}`)} />
                    </Field>
                  ))}
                </div>
                <FieldHint hint="Optional. You can set or change prices later." />
              </FieldSet>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-product"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Add product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
