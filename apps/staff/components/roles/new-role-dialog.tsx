"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

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
import { api, type RoleSummary } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

const EMPTY = "__blank__"

/** Makes a new role, empty or copied from an existing one, then opens it to tick the boxes. */
export function NewRoleDialog({
  open,
  onOpenChange,
  roles,
  copyFrom,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: RoleSummary[]
  copyFrom?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [source, setSource] = React.useState(EMPTY)

  React.useEffect(() => {
    if (open) {
      const source = roles.find((r) => r.name === copyFrom)
      setName(
        source ? `${source.built_in ? source.label : source.name} (copy)` : ""
      )
      setDescription("")
      setSource(copyFrom ?? EMPTY)
      check.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open])

  const check = useFormCheck({
    role_name:
      name.trim().length >= 3
        ? undefined
        : "Give the role a name of at least 3 letters.",
  })

  const mutation = useMutation({
    mutationFn: () =>
      api.createRole({
        name: name.trim(),
        description: description.trim(),
        copy_from: source === EMPTY ? undefined : source,
      }),
    onSuccess: (role) => {
      notifySuccess("Role created", "Now choose what it can do.")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      onOpenChange(false)
      router.push(`/settings/roles/${encodeURIComponent(role.name)}`)
    },
    onError: (e) => notifyError(e, "Couldn't create the role"),
  })

  const label = (r: RoleSummary) => (r.built_in ? r.label : r.name)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>
            A role is a set of things a person may do. After you create it, you
            choose what it can do, then give it to people.
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-role"
          noValidate
          onSubmit={(e) => check.submit(e, () => mutation.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("role_name")}>
              <RequiredLabel htmlFor="role_name">Role name</RequiredLabel>
              <Input
                id="role_name"
                value={name}
                maxLength={40}
                placeholder="For example: Senior cashier"
                aria-invalid={check.invalid("role_name")}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldHint error={check.error("role_name")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="role_source">Start from</FieldLabel>
              <Select
                value={source}
                onValueChange={(v) => setSource(v ?? EMPTY)}
              >
                <SelectTrigger id="role_source" className="w-full">
                  <SelectValue>
                    {(value: string) => {
                      if (value === EMPTY) return "Blank role"
                      const found = roles.find((r) => r.name === value)
                      return `Copy of ${found ? label(found) : value}`
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={EMPTY}>
                      Blank role (nothing allowed yet)
                    </SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.name} value={r.name}>
                        Copy of {label(r)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="role_description">
                What is it for?
              </FieldLabel>
              <Input
                id="role_description"
                value={description}
                placeholder="A short note for other owners"
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="new-role" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
