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
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
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

import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { api, type ProductDetail } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

/** Adds a selling unit such as "1 Box = 12 Piece". Prices for it are set in the Prices tab. */
export function AddUnitDialog({
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
  const taken = new Set([product.stock_uom, ...product.uoms.map((u) => u.uom)])
  const choices = (options.data?.uoms ?? []).filter((u) => !taken.has(u))
  const [uom, setUom] = React.useState("")
  const [pieces, setPieces] = React.useState("")

  const mutation = useMutation({
    mutationFn: () =>
      api.addUnit({
        item_code: product.item_code,
        uom,
        pieces: Number(pieces),
      }),
    onSuccess: () => {
      notifySuccess("Unit added", `${uom} = ${pieces} ${product.stock_uom}`)
      queryClient.invalidateQueries({
        queryKey: ["product", product.item_code],
      })
      onOpenChange(false)
    },
    onError: (e) => notifyError(e, "Couldn't add the unit"),
  })

  const check = useFormCheck({
    unit_uom: uom ? undefined : "Choose a unit.",
    unit_pieces:
      Number(pieces) > 0 ? undefined : "Enter how many pieces are in one unit.",
  })

  React.useEffect(() => {
    if (open) {
      setUom("")
      setPieces("")
      check.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a unit</DialogTitle>
          <DialogDescription>
            Sell {product.item_name} by the box, dozen or carton as well as by
            the {product.stock_uom.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <form
          id="add-unit"
          noValidate
          onSubmit={(e) => check.submit(e, () => mutation.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("unit_uom")}>
              <RequiredLabel htmlFor="unit_uom">Unit</RequiredLabel>
              <Select
                value={uom || null}
                onValueChange={(v) => setUom(v ?? "")}
              >
                <SelectTrigger
                  id="unit_uom"
                  className="w-full"
                  aria-invalid={check.invalid("unit_uom")}
                >
                  <SelectValue
                    placeholder={
                      choices.length ? "Choose a unit" : "No more units"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {choices.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldHint error={check.error("unit_uom")} />
            </Field>
            <Field data-invalid={check.invalid("unit_pieces")}>
              <RequiredLabel htmlFor="unit_pieces">
                How many {product.stock_uom.toLowerCase()}s in one{" "}
                {uom ? uom.toLowerCase() : "unit"}?
              </RequiredLabel>
              <Input
                id="unit_pieces"
                inputMode="decimal"
                value={pieces}
                aria-invalid={check.invalid("unit_pieces")}
                onChange={(e) => setPieces(e.target.value)}
                placeholder="12"
              />
              <FieldHint
                error={check.error("unit_pieces")}
                hint="Prices for the new unit are set on the product page."
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-unit"
            disabled={mutation.isPending || choices.length === 0}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Add unit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
