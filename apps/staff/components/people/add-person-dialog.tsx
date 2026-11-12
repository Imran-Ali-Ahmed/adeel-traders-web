"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { TriangleAlertIcon } from "lucide-react"

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
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"

import {
  BranchPicker,
  RolePicker,
  TempPassword,
} from "@/components/people/people-parts"
import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { api, type PersonRole } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

const OWNER = "AT Owner"

/** Add a login: name, email, role(s), branch. Ends by showing the temporary password once. */
export function AddPersonDialog({
  open,
  onOpenChange,
  roles,
  branches,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: PersonRole[]
  branches: string[]
}) {
  const queryClient = useQueryClient()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [picked, setPicked] = React.useState<string[]>([])
  const [picked_branches, setBranches] = React.useState<string[]>([])
  const [ownerOk, setOwnerOk] = React.useState(false)
  const [created, setCreated] = React.useState<{
    name: string
    password: string
  } | null>(null)

  React.useEffect(() => {
    if (open) {
      setName("")
      setEmail("")
      setPicked([])
      setBranches([])
      setOwnerOk(false)
      setCreated(null)
      check.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open])

  const wantsOwner = picked.includes(OWNER)
  const check = useFormCheck({
    person_name:
      name.trim().length >= 2 ? undefined : "Enter the person's name.",
    person_email: /^\S+@\S+\.\S+$/.test(email.trim())
      ? undefined
      : "Enter an email address. It is their login name.",
    person_roles: picked.length ? undefined : "Choose at least one role.",
    person_owner:
      wantsOwner && !ownerOk
        ? "Tick the box to confirm the Owner role."
        : undefined,
  })

  const mutation = useMutation({
    mutationFn: () =>
      api.addPerson({
        full_name: name.trim(),
        email: email.trim(),
        roles: picked,
        branches: picked_branches,
        confirm_owner: wantsOwner && ownerOk ? 1 : 0,
      }),
    onSuccess: (out) => {
      notifySuccess("Person added", `${name.trim()} can now log in.`)
      queryClient.invalidateQueries({ queryKey: ["people"] })
      setCreated({ name: name.trim(), password: out.temp_password })
    },
    onError: (e) => notifyError(e, "Couldn't add the person"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{created ? "Login ready" : "Add a person"}</DialogTitle>
          <DialogDescription>
            {created
              ? "Hand over the temporary password below."
              : "They log in with their email. You get a temporary password to give them; they choose their own at the first login."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <TempPassword name={created.name} password={created.password} />
        ) : (
          <form
            id="add-person"
            noValidate
            onSubmit={(e) => check.submit(e, () => mutation.mutate())}
          >
            <FieldGroup>
              <Field data-invalid={check.invalid("person_name")}>
                <RequiredLabel htmlFor="person_name">Full name</RequiredLabel>
                <Input
                  id="person_name"
                  value={name}
                  placeholder="For example: Nida Shah"
                  aria-invalid={check.invalid("person_name")}
                  onChange={(e) => setName(e.target.value)}
                />
                <FieldHint error={check.error("person_name")} />
              </Field>
              <Field data-invalid={check.invalid("person_email")}>
                <RequiredLabel htmlFor="person_email">Email</RequiredLabel>
                <Input
                  id="person_email"
                  type="email"
                  value={email}
                  placeholder="name@example.com"
                  aria-invalid={check.invalid("person_email")}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <FieldHint error={check.error("person_email")} />
              </Field>
              <Field data-invalid={check.invalid("person_roles")}>
                <RequiredLabel>Role</RequiredLabel>
                <RolePicker
                  options={roles}
                  value={picked}
                  onChange={setPicked}
                />
                <FieldHint
                  error={check.error("person_roles")}
                  hint="Most people need one role. You can pick more."
                />
              </Field>
              {wantsOwner && (
                <Field data-invalid={check.invalid("person_owner")}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-warning/10 p-3 text-sm">
                    <Checkbox
                      checked={ownerOk}
                      onCheckedChange={(v) => setOwnerOk(Boolean(v))}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 font-medium text-warning-ink">
                        <TriangleAlertIcon className="size-3.5" />
                        Owner can do everything
                      </span>
                      <span className="text-muted-foreground">
                        Including prices, cost, users and settings. I want to
                        give this person the Owner role.
                      </span>
                    </span>
                  </label>
                  <FieldHint error={check.error("person_owner")} />
                </Field>
              )}
              <Field>
                <FieldLabel>Works at</FieldLabel>
                <BranchPicker
                  options={branches}
                  value={picked_branches}
                  onChange={setBranches}
                />
                <FieldHint hint="Staff limited to some branches can only move and count stock there." />
              </Field>
            </FieldGroup>
          </form>
        )}

        <DialogFooter>
          {created ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="add-person"
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Spinner data-icon="inline-start" />}
                Add person
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
