"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CopyIcon,
  HistoryIcon,
  LockIcon,
  PencilIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"

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
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"

import { NewRoleDialog } from "@/components/roles/new-role-dialog"
import { HistoryCard } from "@/components/ui-kit/history-panel"
import { IconTile } from "@/components/ui-kit/icon-tile"
import { sameDraft, type Draft } from "@/components/roles/grants"
import {
  AccessList,
  PersonAvatar,
  SWITCH_STYLE,
} from "@/components/roles/role-parts"
import { api, type RoleDetail } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

function fromServer(role: RoleDetail): Draft {
  return {
    grants: role.areas,
    flags: role.flags,
    description: role.description,
  }
}

const FALLBACK_SWITCH = SWITCH_STYLE.cost!

const LEAVE_WARNING =
  "You have changes that are not saved. Leave without saving?"

/** Warns before the page is closed, reloaded or left through a link while changes are unsaved. */
function useUnsavedWarning(dirty: boolean) {
  React.useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a[href]")
      if (link && !window.confirm(LEAVE_WARNING)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("click", onClick, true)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("click", onClick, true)
    }
  }, [dirty])
}

export default function RolePage() {
  const params = useParams<{ name: string }>()
  const name = decodeURIComponent(params.name)
  const router = useRouter()
  const queryClient = useQueryClient()
  const role = useQuery({
    queryKey: ["role", name],
    queryFn: () => api.role(name),
  })
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [copying, setCopying] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const data = role.data
  const saved = data ? fromServer(data) : null
  const current = draft ?? saved
  const dirty = Boolean(draft && saved && !sameDraft(draft, saved))
  const readOnly = data?.built_in ?? true
  useUnsavedWarning(dirty)

  const save = useMutation({
    mutationFn: () =>
      api.saveRole({
        name,
        areas: current?.grants ?? {},
        switches: current?.flags ?? {},
        description: current?.description,
      }),
    onSuccess: () => {
      notifySuccess("Role saved", "People with this role get it right away.")
      setDraft(null)
      queryClient.invalidateQueries({ queryKey: ["role", name] })
      queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
    onError: (e) => notifyError(e, "Couldn't save the role"),
  })
  const remove = useMutation({
    mutationFn: () => api.deleteRole(name),
    onSuccess: () => {
      notifySuccess("Role deleted")
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      router.replace("/settings/roles")
    },
    onError: (e) => notifyError(e, "Couldn't delete the role"),
  })

  if (role.isLoading || !data || !current) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        {role.error ? (
          <p className="text-destructive">{role.error.message}</p>
        ) : (
          <Skeleton className="h-96 rounded-xl" />
        )}
      </div>
    )
  }

  const update = (patch: Partial<Draft>) => setDraft({ ...current, ...patch })

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 pb-28 md:p-8 md:pb-28">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <IconTile
              icon={readOnly ? LockIcon : ShieldCheckIcon}
              tone="fuchsia"
              size="lg"
              className="mt-0.5 size-12 rounded-xl [&>svg]:size-6"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-heading text-3xl font-semibold tracking-tight">
                  {data.label}
                </h1>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {data.built_in ? "Built in" : "Your role"}
                </span>
              </div>
              {readOnly ? (
                <p className="max-w-2xl text-muted-foreground">
                  {data.description}
                </p>
              ) : (
                <label className="flex w-full max-w-2xl cursor-text items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 hover:border-foreground/30">
                  <PencilIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <input
                    aria-label="What is this role for?"
                    value={current.description}
                    placeholder="Note: what is this role for? (optional)"
                    onChange={(e) => update({ description: e.target.value })}
                    className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </label>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {readOnly && (
              <Button onClick={() => setCopying(true)}>
                <CopyIcon data-icon="inline-start" />
                Copy as new role
              </Button>
            )}
          </div>
        </div>
        {readOnly && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LockIcon className="size-3.5 shrink-0" />
            Built-in roles cannot be changed. Copy this role to make your own
            version.
          </p>
        )}
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col rounded-xl border bg-card">
            <header className="border-b px-5 py-4">
              <h2 className="font-heading text-base font-semibold">
                What this role can do
              </h2>
              <p className="text-sm text-muted-foreground">
                {readOnly
                  ? "What this built-in role allows in each area."
                  : "Pick how much for each area. The line under it says what that means."}
              </p>
            </header>
            <AccessList
              registry={data.registry}
              grants={current.grants}
              readOnly={readOnly}
              onChange={(grants) => update({ grants })}
            />
          </section>

          <section className="flex flex-col rounded-xl border bg-card">
            <header className="border-b px-5 py-4">
              <h2 className="font-heading text-base font-semibold">
                Extra access
              </h2>
            </header>
            <ul className="flex flex-col divide-y">
              {(data?.switches ?? []).map((item) => (
                <li key={item.key}>
                  <label className="flex cursor-pointer items-start gap-3 px-5 py-4">
                    <Checkbox
                      checked={Boolean(current.flags[item.key])}
                      disabled={readOnly}
                      className="mt-0.5"
                      onCheckedChange={(on) =>
                        update({
                          flags: { ...current.flags, [item.key]: Boolean(on) },
                        })
                      }
                    />
                    <IconTile
                      icon={(SWITCH_STYLE[item.key] ?? FALLBACK_SWITCH).icon}
                      tone={(SWITCH_STYLE[item.key] ?? FALLBACK_SWITCH).tone}
                      size="sm"
                    />
                    <span className="flex flex-col">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {item.title}
                        {item.private && (
                          <span
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                            title="Private business numbers"
                          >
                            <LockIcon className="size-3" />
                            Private
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.help}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <HistoryCard
            doctype="Role"
            name={data.name}
            icon={HistoryIcon}
            tone="fuchsia"
            description="Who changed this role's permissions, and when."
          />

          {!readOnly && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-card p-5">
              <div className="flex flex-col gap-0.5">
                <h2 className="font-heading text-base font-semibold">
                  Delete this role
                </h2>
                <p className="text-sm text-muted-foreground">
                  {data.users > 0
                    ? `${data.users} ${data.users === 1 ? "person has" : "people have"} this role. Take it away from them first.`
                    : "Nobody has this role, so it can be deleted."}
                </p>
              </div>
              <Button
                variant="outline"
                disabled={data.users > 0}
                onClick={() => setDeleting(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2Icon data-icon="inline-start" />
                Delete role
              </Button>
            </section>
          )}
        </div>

        <aside className="flex flex-col rounded-xl border bg-card lg:sticky lg:top-4">
          <header className="flex items-center gap-2.5 border-b px-5 py-4">
            <IconTile icon={UsersIcon} tone="cobalt" size="sm" />
            <h2 className="font-heading text-base font-semibold">
              People with this role
            </h2>
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {data.people.length}
            </span>
          </header>
          {data.people.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UsersIcon className="size-5" />
              </span>
              <p className="text-sm font-medium">Nobody has this role yet</p>
              <p className="text-xs text-muted-foreground">
                People who get this role will be listed here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y">
              {data.people.map((p) => (
                <li key={p.user} className="flex items-center gap-3 px-5 py-3">
                  <PersonAvatar user={p.user} name={p.name} size="default" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {p.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {p.user}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {dirty && !readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 md:left-(--sidebar-width,0) md:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="text-sm font-medium">
              You have changes not saved yet
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDraft(null)}>
                Discard
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending && <Spinner data-icon="inline-start" />}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <NewRoleDialog
        open={copying}
        onOpenChange={setCopying}
        roles={[data]}
        copyFrom={data.name}
      />
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {data.label}?</DialogTitle>
            <DialogDescription>
              The role is removed for good. Nobody has it, so no one loses
              access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              {remove.isPending && <Spinner data-icon="inline-start" />}
              Delete role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
