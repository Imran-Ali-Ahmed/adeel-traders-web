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
import { Field, FieldGroup } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"

import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { api, type ProductDetail } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

type Entry = { value: string; abbr: string }

/**
 * A new variant of the same product (another shade, size, fragrance…). One field per attribute
 * the product uses; picking an existing value needs nothing else, a new value needs a short code
 * (it becomes part of the product code). ERPNext creates the variant.
 */
export function AddVariantDialog({
  product,
  open,
  onOpenChange,
  onCreated,
}: {
  product: ProductDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (itemCode: string) => void
}) {
  const queryClient = useQueryClient()
  const attributes = useQuery({
    queryKey: ["variant-attributes", product.item_code],
    queryFn: () => api.variantAttributes(product.item_code),
    enabled: open,
  })
  const [entries, setEntries] = React.useState<Record<string, Entry>>({})
  const list = attributes.data ?? []

  const isNew = (attribute: string) => {
    const typed = (entries[attribute]?.value ?? "").trim()
    const known = list.find((a) => a.attribute === attribute)?.values ?? []
    return typed !== "" && !known.some((v) => v.value === typed)
  }

  const check = useFormCheck(
    Object.fromEntries(
      list.flatMap((a) => [
        [
          `variant-${a.attribute}`,
          (entries[a.attribute]?.value ?? "").trim()
            ? undefined
            : `Enter or choose a ${a.attribute.toLowerCase()}.`,
        ],
        [
          `variant-code-${a.attribute}`,
          isNew(a.attribute) && !(entries[a.attribute]?.abbr ?? "").trim()
            ? "A new value needs a short code."
            : undefined,
        ],
      ])
    )
  )

  React.useEffect(() => {
    if (open) {
      // start from this variant's own values, so only what changes needs typing
      setEntries(
        Object.fromEntries(
          product.attributes.map((a) => [
            a.attribute,
            { value: a.value, abbr: "" },
          ])
        )
      )
      check.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open, product.item_code])

  const mutation = useMutation({
    mutationFn: () =>
      api.addVariant({
        item_code: product.item_code,
        values: Object.fromEntries(
          list.map((a) => [
            a.attribute,
            {
              value: (entries[a.attribute]?.value ?? "").trim(),
              abbr: isNew(a.attribute)
                ? (entries[a.attribute]?.abbr ?? "").trim()
                : undefined,
            },
          ])
        ),
      }),
    onSuccess: ({ item_code }) => {
      notifySuccess("Variant added", item_code)
      queryClient.invalidateQueries({ queryKey: ["products"] })
      onOpenChange(false)
      onCreated(item_code)
    },
    onError: (e) => notifyError(e, "Couldn't add the variant"),
  })

  const base = product.variant_of ?? product.item_code
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add variant</DialogTitle>
          <DialogDescription>
            Another version of {base}. Change what is different; it starts with
            no stock and no prices.
          </DialogDescription>
        </DialogHeader>
        {attributes.isLoading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <form
            id="add-variant"
            noValidate
            onSubmit={(e) => check.submit(e, () => mutation.mutate())}
          >
            <FieldGroup>
              {list.map((a) => {
                const entry = entries[a.attribute] ?? { value: "", abbr: "" }
                const id = `variant-${a.attribute}`
                return (
                  <div key={a.attribute} className="flex flex-col gap-3">
                    <Field data-invalid={check.invalid(id)}>
                      <RequiredLabel htmlFor={id}>{a.attribute}</RequiredLabel>
                      <Input
                        id={id}
                        list={`${id}-values`}
                        value={entry.value}
                        aria-invalid={check.invalid(id)}
                        onChange={(e) =>
                          setEntries({
                            ...entries,
                            [a.attribute]: { ...entry, value: e.target.value },
                          })
                        }
                        placeholder={`Choose or type a new ${a.attribute.toLowerCase()}`}
                      />
                      <datalist id={`${id}-values`}>
                        {a.values.map((v) => (
                          <option key={v.value} value={v.value} />
                        ))}
                      </datalist>
                      <FieldHint error={check.error(id)} />
                    </Field>
                    {isNew(a.attribute) && (
                      <Field
                        data-invalid={check.invalid(
                          `variant-code-${a.attribute}`
                        )}
                      >
                        <RequiredLabel htmlFor={`variant-code-${a.attribute}`}>
                          Short code for this new {a.attribute.toLowerCase()}
                        </RequiredLabel>
                        <Input
                          id={`variant-code-${a.attribute}`}
                          value={entry.abbr}
                          aria-invalid={check.invalid(
                            `variant-code-${a.attribute}`
                          )}
                          onChange={(e) =>
                            setEntries({
                              ...entries,
                              [a.attribute]: {
                                ...entry,
                                abbr: e.target.value.toUpperCase(),
                              },
                            })
                          }
                          placeholder="18"
                        />
                        <FieldHint
                          error={check.error(`variant-code-${a.attribute}`)}
                          hint="Added to the product code."
                        />
                      </Field>
                    )}
                  </div>
                )
              })}
            </FieldGroup>
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-variant"
            disabled={mutation.isPending || attributes.isLoading}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Add variant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
