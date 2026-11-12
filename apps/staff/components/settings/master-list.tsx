"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDownIcon,
  InfoIcon,
  LockIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Field, FieldGroup } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { ConfirmDialog } from "@/components/ui-kit/confirm-dialog"
import { ErrorState } from "@/components/ui-kit/error-state"
import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { IconTile, type Tone } from "@/components/ui-kit/icon-tile"
import { Switch } from "@/components/ui-kit/switch"
import { api, type MasterItem, type MasterKind } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

type Editing = { mode: "add" } | { mode: "edit"; item: MasterItem } | null

/** Frappe's kinds of payment method, in plain words and in the order people look for them. */
const KINDS: Record<string, { title: string; label: string; hint: string }> = {
  Cash: { title: "Cash", label: "Cash", hint: "Money in the till" },
  Bank: {
    title: "Bank and cards",
    label: "Bank or card",
    hint: "Transfers, cheques, cards",
  },
  Phone: {
    title: "Phone wallets",
    label: "Phone wallet",
    hint: "JazzCash, Easypaisa",
  },
  General: { title: "Other", label: "Other", hint: "Anything else" },
}
const KIND_ORDER = ["Cash", "Bank", "Phone", "General"]

function EditDialog({
  kind,
  editing,
  types,
  noun,
  onClose,
}: {
  kind: MasterKind
  editing: Editing
  types: string[]
  noun: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState("")
  React.useEffect(() => {
    setName(editing?.mode === "edit" ? editing.item.name : "")
    setType(editing?.mode === "edit" ? (editing.item.type ?? "") : "")
  }, [editing])
  const adding = editing?.mode === "add"
  const check = useFormCheck({
    ml_name: !name.trim() ? `Enter the ${noun}'s name.` : undefined,
    ml_type: types.length && !type ? "Choose what kind it is." : undefined,
  })
  const save = useMutation({
    mutationFn: async () => {
      if (editing?.mode !== "edit")
        return api.addMaster(kind, name.trim(), { type: type || undefined })
      const item = editing.item
      let current = item.name
      if (name.trim() !== item.name)
        current = (await api.renameMaster(kind, item.name, name.trim())).name
      if (type && type !== item.type) await api.setPaymentKind(current, type)
    },
    onSuccess: () => {
      notifySuccess(adding ? "Added" : "Saved")
      queryClient.invalidateQueries({ queryKey: ["masters", kind] })
      check.reset()
      onClose()
    },
    onError: (e) => notifyError(e, "Couldn't save"),
  })
  const locked = editing?.mode === "edit" && editing.item.core
  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {adding ? `Add ${noun}` : `Edit ${editing?.item.name ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            {adding
              ? `The new ${noun} can be used straight away.`
              : "Everything that uses it keeps working with the new name."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="master-form"
          noValidate
          onSubmit={(e) => check.submit(e, () => save.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("ml_name")}>
              <RequiredLabel htmlFor="ml_name">Name</RequiredLabel>
              <Input
                id="ml_name"
                value={name}
                disabled={locked}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={check.invalid("ml_name")}
              />
              <FieldHint
                error={check.error("ml_name")}
                hint={locked ? "Built in: it keeps its name." : undefined}
              />
            </Field>
            {types.length > 0 && (
              <Field data-invalid={check.invalid("ml_type")}>
                <RequiredLabel htmlFor="ml_type">Kind</RequiredLabel>
                <Select
                  value={type}
                  onValueChange={(v) => setType(String(v ?? ""))}
                  items={Object.fromEntries(
                    types.map((t) => [t, KINDS[t]?.label ?? t])
                  )}
                >
                  <SelectTrigger
                    id="ml_type"
                    className="w-full"
                    aria-invalid={check.invalid("ml_type")}
                  >
                    <SelectValue placeholder="Cash, bank, phone wallet…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {types.map((t) => (
                        <SelectItem key={t} value={t}>
                          {KINDS[t]?.label ?? t}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldHint error={check.error("ml_type")} />
              </Field>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="master-form" disabled={save.isPending}>
            {save.isPending && <Spinner data-icon="inline-start" />}
            {adding ? "Add" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const ROW =
  "grid items-center gap-x-4 gap-y-1 px-5 py-2.5 md:min-h-14 grid-cols-[minmax(0,1fr)_auto_auto] md:grid-cols-[minmax(0,1fr)_9rem_4.5rem_2.25rem]"

/**
 * A Settings list of simple records (Payment methods; Units has its own page): grouped by kind,
 * an on/off switch, and rename or delete in a "⋯" menu. Delete only appears when nothing uses
 * the record. The server decides who may change it and what "in use" means.
 */
export function MasterListPage({
  kind,
  title,
  description,
  noun,
  usedWord,
  icon,
  tone,
  note,
}: {
  kind: MasterKind
  title: string
  description: string
  /** "payment method" */
  noun: string
  /** "payments" */
  usedWord: string
  icon: LucideIcon
  tone: Tone
  note?: React.ReactNode
}) {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ["masters", kind],
    queryFn: () => api.masters(kind),
  })
  const [editing, setEditing] = React.useState<Editing>(null)
  const [deleting, setDeleting] = React.useState<MasterItem | null>(null)
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["masters", kind] })
  const toggle = useMutation({
    mutationFn: (v: { name: string; enabled: boolean }) =>
      api.setMasterEnabled(kind, v.name, v.enabled),
    onSuccess: (_r, v) => {
      notifySuccess(
        v.enabled ? `${v.name} switched on` : `${v.name} switched off`
      )
      refresh()
    },
    onError: (e) => notifyError(e, "Couldn't change it"),
  })
  const remove = useMutation({
    mutationFn: (name: string) => api.deleteMaster(kind, name),
    onSuccess: (_r, name) => {
      notifySuccess(`${name} deleted`)
      setDeleting(null)
      refresh()
    },
    onError: (e) => {
      setDeleting(null)
      notifyError(e, "Couldn't delete")
    },
  })
  const data = q.data
  const items = data?.items ?? []
  const canEdit = data?.can_edit ?? false
  const active = items.filter((i) => i.enabled)
  const off = items.filter((i) => !i.enabled)
  const kinds = KIND_ORDER.filter((k) => active.some((i) => i.type === k))
  const other = active.filter((i) => !KIND_ORDER.includes(i.type ?? ""))

  const row = (i: MasterItem) => (
    <li key={i.name} className={ROW}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium">{i.name}</span>
        {i.core && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  aria-label="Built in: can't be renamed or deleted"
                  className="rounded-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
              }
            >
              <LockIcon className="size-3" />
            </TooltipTrigger>
            <TooltipContent>
              Built in: ERPNext uses it, so it keeps its name and stays on
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      <span className="text-sm text-muted-foreground max-md:hidden">
        {i.used ? `${i.used} ${usedWord}` : "—"}
      </span>
      <span className="flex md:justify-center">
        {canEdit && !i.core ? (
          <Switch
            on={i.enabled}
            label={i.enabled ? `Switch ${i.name} off` : `Switch ${i.name} on`}
            disabled={toggle.isPending}
            onChange={(enabled) => toggle.mutate({ name: i.name, enabled })}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {i.core ? "Always on" : ""}
          </span>
        )}
      </span>
      <span className="flex justify-end">
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`More for ${i.name}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => setEditing({ mode: "edit", item: i })}
              >
                <PencilIcon />
                {i.core ? "Change kind" : "Edit"}
              </DropdownMenuItem>
              {i.can_delete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleting(i)}
                >
                  <Trash2Icon />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
    </li>
  )

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-80 items-start gap-3">
          <IconTile icon={icon} tone={tone} size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setEditing({ mode: "add" })}>
            <PlusIcon data-icon="inline-start" />
            Add {noun}
          </Button>
        )}
      </div>
      {note && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <span>{note}</span>
        </p>
      )}
      {q.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : q.error ? (
        <ErrorState
          title={`Couldn't load ${title.toLowerCase()}`}
          message={q.error.message}
          onRetry={() => q.refetch()}
          retrying={q.isFetching}
        />
      ) : items.length === 0 ? (
        <p className="rounded-xl border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          Nothing here yet. Add the first {noun}.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="flex flex-col divide-y">
            {[...kinds, ...(other.length ? ["__other__"] : [])].map((k) => {
              const rows =
                k === "__other__" ? other : active.filter((i) => i.type === k)
              const info =
                k === "__other__"
                  ? KINDS.General!
                  : (KINDS[k] ?? KINDS.General!)
              return (
                <React.Fragment key={k}>
                  <li className="flex flex-wrap items-baseline gap-x-2 bg-muted/40 px-5 py-2 text-sm">
                    <span className="font-semibold">{info.title}</span>
                    <span className="text-muted-foreground">{info.hint}</span>
                  </li>
                  {rows.map(row)}
                </React.Fragment>
              )
            })}
          </ul>
          {off.length > 0 && (
            <details className="group/off border-t">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronDownIcon className="size-4 transition-transform group-open/off:rotate-180" />
                Switched off ({off.length})
              </summary>
              <ul className="flex flex-col divide-y border-t bg-muted/20">
                {off.map(row)}
              </ul>
            </details>
          )}
        </div>
      )}
      <EditDialog
        kind={kind}
        editing={editing}
        types={data?.types ?? []}
        noun={noun}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && !remove.isPending && setDeleting(null)}
        title={`Delete ${deleting?.name ?? ""}?`}
        description="Nothing uses it, so nothing breaks. If you may need it again, switch it off instead."
        confirmLabel={`Delete ${noun}`}
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.name)}
      />
    </div>
  )
}
