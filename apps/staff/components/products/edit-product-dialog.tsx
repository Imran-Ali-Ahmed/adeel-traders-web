"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"

import { BrandSelect } from "@/components/ui-kit/brand-select"
import {
  FieldHint,
  isAmount,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { api, type ProductDetail } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: ProductDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const options = useQuery({
    queryKey: ["form-options"],
    queryFn: api.formOptions,
  })
  const [name, setName] = React.useState(product.item_name)
  const [group, setGroup] = React.useState(product.item_group)
  const [level, setLevel] = React.useState("")
  const [qty, setQty] = React.useState("")
  const [disabled, setDisabled] = React.useState(Boolean(product.disabled))
  const [brand, setBrand] = React.useState<string | null>(product.brand)
  const [description, setDescription] = React.useState(
    product.description ?? ""
  )
  const check = useFormCheck({
    edit_name: name.trim() ? undefined : "Enter the product name.",
    edit_level: isAmount(level)
      ? undefined
      : "Enter a number, or leave it empty.",
    edit_qty: isAmount(qty) ? undefined : "Enter a number, or leave it empty.",
  })

  React.useEffect(() => {
    if (!open) return
    setName(product.item_name)
    setGroup(product.item_group)
    setLevel(
      product.reorder_main.level ? String(product.reorder_main.level) : ""
    )
    setQty(product.reorder_main.qty ? String(product.reorder_main.qty) : "")
    setDisabled(Boolean(product.disabled))
    setBrand(product.brand)
    setDescription(product.description ?? "")
    check.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open, product])

  const mutation = useMutation({
    mutationFn: () =>
      api.updateProduct({
        item_code: product.item_code,
        item_name: name,
        item_group: group,
        reorder_level: Number(level) || 0,
        reorder_qty: Number(qty) || 0,
        disabled,
        brand,
        description,
      }),
    onSuccess: () => {
      notifySuccess("Product saved", product.item_code)
      queryClient.invalidateQueries({
        queryKey: ["product", product.item_code],
      })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      onOpenChange(false)
    },
    onError: (e) => notifyError(e, "Couldn't save the product"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            {product.item_code}. Changes apply everywhere this product is shown
            and sold.
          </DialogDescription>
        </DialogHeader>
        <form
          id="edit-product"
          noValidate
          onSubmit={(e) => check.submit(e, () => mutation.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("edit_name")}>
              <RequiredLabel htmlFor="edit_name">Name</RequiredLabel>
              <Input
                id="edit_name"
                value={name}
                aria-invalid={check.invalid("edit_name")}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldHint error={check.error("edit_name")} />
            </Field>
            <Field>
              <RequiredLabel htmlFor="edit_group">Category</RequiredLabel>
              <Select value={group} onValueChange={(v) => setGroup(v ?? group)}>
                <SelectTrigger id="edit_group" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(options.data?.item_groups ?? [product.item_group]).map(
                      (g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      )
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit_brand">Brand</FieldLabel>
              <BrandSelect
                id="edit_brand"
                value={brand}
                onChange={setBrand}
                brands={options.data?.brands ?? []}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit_description">Description</FieldLabel>
              <Textarea
                id="edit_description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What it is, finish, size, who it suits"
                rows={3}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={check.invalid("edit_level")}>
                <FieldLabel htmlFor="edit_level">Reorder level</FieldLabel>
                <Input
                  id="edit_level"
                  inputMode="decimal"
                  value={level}
                  aria-invalid={check.invalid("edit_level")}
                  onChange={(e) => setLevel(e.target.value)}
                  placeholder="20"
                />
                <FieldHint error={check.error("edit_level")} />
              </Field>
              <Field data-invalid={check.invalid("edit_qty")}>
                <FieldLabel htmlFor="edit_qty">Usual order</FieldLabel>
                <Input
                  id="edit_qty"
                  inputMode="decimal"
                  value={qty}
                  aria-invalid={check.invalid("edit_qty")}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="60"
                />
                <FieldHint error={check.error("edit_qty")} />
              </Field>
            </div>
            <FieldDescription>
              For the Main Warehouse. When available stock drops to the level, a
              purchase request is raised for the usual order. Leave the level
              empty to turn it off.
            </FieldDescription>
            <Field orientation="horizontal">
              <Checkbox
                id="edit_disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(Boolean(checked))}
              />
              <FieldLabel htmlFor="edit_disabled">
                Inactive (hide from the product list)
              </FieldLabel>
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-product"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
