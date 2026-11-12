"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { KeyRoundIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup } from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"

import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { PasswordInput } from "@/components/ui-kit/password-input"
import { api } from "@/lib/api"
import { logout } from "@/lib/frappe"
import { notifyError, notifySuccess } from "@/lib/notify"

/**
 * Shown instead of the app when the owner gave this person a temporary password: they choose
 * their own before anything else. The server enforces the password rules.
 */
export function ChangePasswordScreen({ name }: { name: string }) {
  const queryClient = useQueryClient()
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [again, setAgain] = React.useState("")

  const check = useFormCheck({
    pw_current: current
      ? undefined
      : "Enter the temporary password you were given.",
    pw_new:
      next.length >= 8
        ? undefined
        : "Use at least 8 characters, for example three words and a number.",
    pw_again:
      again === next ? undefined : "The two passwords are not the same.",
  })

  const mutation = useMutation({
    mutationFn: () => api.changeMyPassword(current, next),
    onSuccess: () => {
      notifySuccess("Password changed", "Use your new password from now on.")
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
    onError: (e) => notifyError(e, "Couldn't change the password"),
  })

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-chart-4/14 text-chart-4">
            <KeyRoundIcon className="size-5" />
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Choose your password
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome, {name}. You logged in with a temporary password. Choose
            your own to continue.
          </p>
        </div>
        <form
          noValidate
          onSubmit={(e) => check.submit(e, () => mutation.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("pw_current")}>
              <RequiredLabel htmlFor="pw_current">
                Temporary password
              </RequiredLabel>
              <PasswordInput
                id="pw_current"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <FieldHint error={check.error("pw_current")} />
            </Field>
            <Field data-invalid={check.invalid("pw_new")}>
              <RequiredLabel htmlFor="pw_new">New password</RequiredLabel>
              <PasswordInput
                id="pw_new"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <FieldHint
                error={check.error("pw_new")}
                hint="Long and easy to remember works best, like three words and a number."
              />
            </Field>
            <Field data-invalid={check.invalid("pw_again")}>
              <RequiredLabel htmlFor="pw_again">
                New password again
              </RequiredLabel>
              <PasswordInput
                id="pw_again"
                autoComplete="new-password"
                value={again}
                onChange={(e) => setAgain(e.target.value)}
              />
              <FieldHint error={check.error("pw_again")} />
            </Field>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              Save password
            </Button>
          </FieldGroup>
        </form>
        <button
          type="button"
          onClick={async () => {
            await logout()
            window.location.assign("/login")
          }}
          className="cursor-pointer self-center text-sm text-muted-foreground hover:text-foreground"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
