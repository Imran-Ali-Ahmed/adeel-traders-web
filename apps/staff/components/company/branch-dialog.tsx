"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

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
import { Spinner } from "@workspace/ui/components/spinner"

import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { api, type CompanyBranch } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

/** Add a branch (with its own stock location and accounts), or rename one and set its address. */
export function BranchDialog({
  open,
  onOpenChange,
  branch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Leave out to add a new branch. */
  branch?: CompanyBranch
}) {
  const queryClient = useQueryClient()
  const [name, setName] = React.useState("")
  const [line1, setLine1] = React.useState("")
  const [city, setCity] = React.useState("")
  const [phone, setPhone] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName(branch?.name ?? "")
      setLine1(branch?.address.address_line1 ?? "")
      setCity(branch?.address.city ?? "")
      setPhone(branch?.address.phone ?? "")
      check.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open])

  const check = useFormCheck({
    branch_name:
      name.trim().length >= 2 ? undefined : "Give the branch a name.",
    branch_line1:
      !line1.trim() && (city.trim() || phone.trim())
        ? city.trim()
          ? "Enter the street address as well."
          : "Enter the address and city too: the phone is saved with them."
        : undefined,
    branch_city:
      line1.trim() && !city.trim() ? "Enter the city as well." : undefined,
  })

  const mutation = useMutation({
    mutationFn: () =>
      branch
        ? api.updateBranch({
            branch: branch.name,
            new_name: name.trim(),
            address_line1: line1,
            city,
            phone,
          })
        : api.addBranch({
            name: name.trim(),
            address_line1: line1,
            city,
            phone,
          }),
    onSuccess: (b) => {
      notifySuccess(
        branch ? "Branch saved" : "Branch added",
        branch
          ? undefined
          : `${b.name} has its own stock location and accounts.`
      )
      queryClient.invalidateQueries({ queryKey: ["company"] })
      queryClient.invalidateQueries({ queryKey: ["people"] })
      onOpenChange(false)
    },
    onError: (e) => notifyError(e, "Couldn't save the branch"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {branch ? `Edit ${branch.name}` : "Add a branch"}
          </DialogTitle>
          <DialogDescription>
            {branch
              ? "Renaming keeps all its stock, sales and people. Branches are never deleted."
              : "A new shop or warehouse. It gets its own stock location and its own accounts, so stock and sales work at once."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="branch-form"
          noValidate
          onSubmit={(e) => check.submit(e, () => mutation.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("branch_name")}>
              <RequiredLabel htmlFor="branch_name">Branch name</RequiredLabel>
              <Input
                id="branch_name"
                value={name}
                maxLength={40}
                placeholder="For example: Gulberg Shop"
                onChange={(e) => setName(e.target.value)}
              />
              <FieldHint error={check.error("branch_name")} />
            </Field>
            <Field
              data-invalid={
                check.invalid("branch_line1") ?? check.invalid("branch_city")
              }
            >
              <FieldLabel htmlFor="branch_line1">Address</FieldLabel>
              <Input
                id="branch_line1"
                value={line1}
                placeholder="Street and building"
                aria-invalid={check.invalid("branch_line1")}
                onChange={(e) => setLine1(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="branch_city"
                  aria-label="City"
                  value={city}
                  placeholder="City"
                  aria-invalid={check.invalid("branch_city")}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  aria-label="Phone"
                  type="tel"
                  value={phone}
                  placeholder="Phone"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <FieldHint
                error={
                  check.error("branch_line1") ?? check.error("branch_city")
                }
                hint="Printed on this branch's receipts."
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
            form="branch-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            {branch ? "Save branch" : "Add branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
