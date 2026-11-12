"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  HistoryIcon,
  KeyRoundIcon,
  LockIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UserCheckIcon,
  UserXIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"

import {
  AccessCard,
  BranchPicker,
  PersonStatus,
  RoleChips,
  RolePicker,
  TempPassword,
} from "@/components/people/people-parts"
import { PersonAvatar } from "@/components/roles/role-parts"
import { HistoryCard } from "@/components/ui-kit/history-panel"
import { ConfirmDialog } from "@/components/ui-kit/confirm-dialog"
import { ErrorState } from "@/components/ui-kit/error-state"
import { IconTile } from "@/components/ui-kit/icon-tile"
import { api } from "@/lib/api"
import { timeAgo } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

const OWNER = "AT Owner"

export default function PersonPage() {
  const params = useParams<{ user: string }>()
  const user = decodeURIComponent(params.user)
  const queryClient = useQueryClient()
  const person = useQuery({
    queryKey: ["person", user],
    queryFn: () => api.person(user),
  })
  const data = person.data

  const [roles, setRoles] = React.useState<string[] | null>(null)
  const [branches, setBranches] = React.useState<string[] | null>(null)
  const [ownerOk, setOwnerOk] = React.useState(false)
  const [temp, setTemp] = React.useState<string | null>(null)
  const [confirmDisable, setConfirmDisable] = React.useState(false)
  const [confirmReset, setConfirmReset] = React.useState(false)

  const savedRoles = data?.roles.map((r) => r.key) ?? []
  const savedBranches = data?.branches ?? []
  const currentRoles = roles ?? savedRoles
  const currentBranches = branches ?? savedBranches
  const rolesChanged =
    roles !== null &&
    JSON.stringify([...roles].sort()) !== JSON.stringify([...savedRoles].sort())
  const branchChanged =
    branches !== null &&
    JSON.stringify([...branches].sort()) !==
      JSON.stringify([...savedBranches].sort())
  const newOwner = currentRoles.includes(OWNER) && !savedRoles.includes(OWNER)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["person", user] })
    queryClient.invalidateQueries({ queryKey: ["people"] })
  }
  const save = useMutation({
    mutationFn: () =>
      api.updatePerson({
        user,
        ...(rolesChanged ? { roles: currentRoles } : {}),
        ...(branchChanged ? { branches: currentBranches } : {}),
        confirm_owner: newOwner && ownerOk ? 1 : 0,
      }),
    onSuccess: () => {
      notifySuccess("Changes saved", "They apply at their next action.")
      setRoles(null)
      setBranches(null)
      setOwnerOk(false)
      refresh()
    },
    onError: (e) => notifyError(e, "Couldn't save"),
  })
  const toggle = useMutation({
    mutationFn: (enabled: 0 | 1) => api.updatePerson({ user, enabled }),
    onSuccess: (p) => {
      notifySuccess(p.enabled ? "Login enabled" : "Login disabled")
      setConfirmDisable(false)
      refresh()
    },
    onError: (e) => notifyError(e, "Couldn't change the login"),
  })
  const reset = useMutation({
    mutationFn: () => api.resetPassword(user),
    onSuccess: (out) => {
      setConfirmReset(false)
      setTemp(out.temp_password)
      refresh()
    },
    onError: (e) => notifyError(e, "Couldn't reset the password"),
  })

  if (person.isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
        {person.error ? (
          <ErrorState
            title="Couldn't open this person"
            message={person.error.message}
            onRetry={() => person.refetch()}
            retrying={person.isFetching}
          >
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/settings/people" />}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Back to People
            </Button>
          </ErrorState>
        ) : (
          <Skeleton className="h-96 rounded-xl" />
        )}
      </div>
    )
  }

  const dirty = rolesChanged || branchChanged

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <PersonAvatar user={data.user} name={data.name} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                {data.name}
              </h1>
              <PersonStatus enabled={data.enabled} />
              {data.is_you && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  You
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {data.email} · Last login {timeAgo(data.last_login).toLowerCase()}
            </p>
          </div>
        </div>
        {!data.is_you && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              <KeyRoundIcon data-icon="inline-start" />
              Reset password
            </Button>
            {data.enabled ? (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDisable(true)}
              >
                <UserXIcon data-icon="inline-start" />
                Disable login
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => toggle.mutate(1)}
                disabled={toggle.isPending}
              >
                <UserCheckIcon data-icon="inline-start" />
                Enable login
              </Button>
            )}
          </div>
        )}
      </header>

      {temp && <TempPassword name={data.name} password={temp} />}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="flex flex-col rounded-xl border bg-card">
          <header className="flex items-center gap-2.5 border-b px-5 py-4">
            <IconTile icon={ShieldCheckIcon} tone="fuchsia" size="sm" />
            <h2 className="font-heading text-base font-semibold">
              Role and branch
            </h2>
          </header>
          <div className="flex flex-col gap-6 p-5">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Role</span>
              {data.is_you ? (
                <>
                  <RoleChips roles={data.roles} />
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <LockIcon className="size-3" />
                    You cannot change your own roles. Ask another owner.
                  </span>
                </>
              ) : (
                <>
                  <RolePicker
                    options={data.roles_available}
                    value={currentRoles}
                    onChange={setRoles}
                  />
                  <span className="text-xs text-muted-foreground">
                    What they can see and do comes from these roles. Change a
                    role itself on the Roles &amp; permissions page.
                  </span>
                </>
              )}
            </div>
            {newOwner && (
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
                    Including prices, cost, users and settings. I want to give{" "}
                    {data.name} the Owner role.
                  </span>
                </span>
              </label>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Works at</span>
              <BranchPicker
                options={data.branches_available}
                value={currentBranches}
                onChange={setBranches}
              />
              <span className="text-xs text-muted-foreground">
                Staff limited to some branches can only move and count stock
                there. They still see stock in other branches.
              </span>
            </div>
          </div>
          {dirty && (
            <footer className="flex items-center justify-end gap-2 border-t bg-muted/40 px-5 py-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRoles(null)
                  setBranches(null)
                  setOwnerOk(false)
                }}
              >
                Discard
              </Button>
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending || (newOwner && !ownerOk)}
              >
                {save.isPending && <Spinner data-icon="inline-start" />}
                Save changes
              </Button>
            </footer>
          )}
        </section>

        <AccessCard
          user={data.user}
          name={data.name}
          isYou={data.is_you}
          access={data.access}
          onChanged={refresh}
        />
      </div>

      <HistoryCard
        doctype="User"
        name={data.user}
        icon={HistoryIcon}
        tone="lime"
        description="Roles, branches, logins and password changes for this person."
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={`Reset ${data.name}'s password?`}
        description="Their current password stops working right away. You get a temporary password to give them in person, and they choose their own at the next login."
        confirmLabel="Reset password"
        pending={reset.isPending}
        onConfirm={() => reset.mutate()}
      />
      <ConfirmDialog
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title={`Disable ${data.name}'s login?`}
        description="They can no longer log in. Nothing they did is deleted, and you can enable the login again at any time."
        confirmLabel="Disable login"
        cancelLabel="Keep it"
        destructive
        pending={toggle.isPending}
        onConfirm={() => toggle.mutate(0)}
      />
    </div>
  )
}
