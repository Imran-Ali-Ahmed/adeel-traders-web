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
  RulerIcon,
  Trash2Icon,
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
import { IconTile } from "@/components/ui-kit/icon-tile"
import { Switch } from "@/components/ui-kit/switch"
import { api, type MasterItem } from "@/lib/api"
import { formatQty } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

const plural = (name: string, n: number) =>
  n === 1 ? name : /(s|x|ch|sh)$/i.test(name) ? `${name}es` : `${name}s`

/** "12 Boxes": the biggest smaller unit that fits a whole number of times (1 Carton = 12 Boxes). */
function madeOf(unit: MasterItem, all: MasterItem[]) {
  const size = unit.standard
  if (!size) return null
  const part = all
    .filter(
      (v) =>
        v.enabled &&
        v.name !== unit.name &&
        v.standard &&
        v.standard > 1 &&
        v.standard < size &&
        size % v.standard === 0
    )
    .sort((a, b) => b.standard! - a.standard!)[0]
  return part
    ? `${size / part.standard!} ${plural(part.name, size / part.standard!)}`
    : null
}

type Editing = { mode: "add" } | { mode: "rename"; name: string } | null

function UnitDialog({
  editing,
  base,
  onClose,
}: {
  editing: Editing
  base: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = React.useState("")
  const [whole, setWhole] = React.useState(true)
  const [pieces, setPieces] = React.useState("")
  React.useEffect(() => {
    setName(editing?.mode === "rename" ? editing.name : "")
    setWhole(true)
    setPieces("")
  }, [editing])
  const piecesNumber = Number(pieces)
  const check = useFormCheck({
    un_name: !name.trim() ? "Enter the unit's name." : undefined,
    un_pieces:
      editing?.mode === "add" && whole && pieces.trim() !== ""
        ? !Number.isInteger(piecesNumber) || piecesNumber < 1
          ? `Enter a whole number of ${plural(base, 2)}, like 12.`
          : undefined
        : undefined,
  })
  const save = useMutation({
    mutationFn: () =>
      editing?.mode === "rename"
        ? api.renameMaster("units", editing.name, name.trim())
        : api.addMaster("units", name.trim(), {
            whole_number: whole,
            pieces: whole && pieces.trim() ? piecesNumber : undefined,
          }),
    onSuccess: () => {
      notifySuccess(editing?.mode === "rename" ? "Renamed" : "Unit added")
      queryClient.invalidateQueries({ queryKey: ["masters", "units"] })
      check.reset()
      onClose()
    },
    onError: (e) => notifyError(e, "Couldn't save"),
  })
  const adding = editing?.mode === "add"
  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {adding ? "Add a unit" : `Rename ${editing?.name ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            {adding
              ? "A way of counting, buying or selling products, like a Pack or a Set."
              : "Every product, price and document that uses it keeps working with the new name."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="unit-form"
          noValidate
          onSubmit={(e) => check.submit(e, () => save.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("un_name")}>
              <RequiredLabel htmlFor="un_name">Name</RequiredLabel>
              <Input
                id="un_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={check.invalid("un_name")}
              />
              <FieldHint error={check.error("un_name")} />
            </Field>
            {adding && (
              <>
                <Field>
                  <span className="text-sm font-medium">
                    How is it counted?
                  </span>
                  <div
                    role="radiogroup"
                    aria-label="How is it counted?"
                    className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
                  >
                    {[
                      {
                        on: true,
                        label: "Whole numbers",
                        hint: "pieces, boxes",
                      },
                      { on: false, label: "Can be split", hint: "kg, litres" },
                    ].map((o) => (
                      <button
                        key={o.label}
                        type="button"
                        role="radio"
                        aria-checked={whole === o.on}
                        onClick={() => setWhole(o.on)}
                        className={cn(
                          "flex cursor-pointer flex-col items-center rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                          whole === o.on &&
                            "bg-card font-medium text-foreground shadow-xs"
                        )}
                      >
                        {o.label}
                        <span className="text-xs font-normal text-muted-foreground">
                          {o.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                  <FieldHint hint="This cannot be changed later, because stock may already be counted in it." />
                </Field>
                {whole && (
                  <Field data-invalid={check.invalid("un_pieces")}>
                    <label htmlFor="un_pieces" className="text-sm font-medium">
                      How many {plural(base, 2)} does one hold?{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </label>
                    <Input
                      id="un_pieces"
                      inputMode="numeric"
                      value={pieces}
                      placeholder="For example 6"
                      onChange={(e) => setPieces(e.target.value)}
                      aria-invalid={check.invalid("un_pieces")}
                    />
                    <FieldHint
                      error={check.error("un_pieces")}
                      hint="The usual size. A product with a different size sets its own on its page."
                    />
                  </Field>
                )}
              </>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="unit-form" disabled={save.isPending}>
            {save.isPending && <Spinner data-icon="inline-start" />}
            {adding ? "Add unit" : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** "1 Dozen = [12] Pieces": the usual size, saved when you leave the box. */
function SizeCell({
  unit,
  all,
  base,
  canEdit,
}: {
  unit: MasterItem
  all: MasterItem[]
  base: string
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const saved = unit.standard ?? null
  const [text, setText] = React.useState(saved === null ? "" : String(saved))
  React.useEffect(() => setText(saved === null ? "" : String(saved)), [saved])
  const save = useMutation({
    mutationFn: (pieces: number | null) =>
      api.setStandardSize(unit.name, pieces),
    onSuccess: (r) => {
      notifySuccess(
        r.standard === null
          ? `${unit.name} size cleared`
          : `1 ${unit.name} = ${formatQty(r.standard)} ${plural(base, r.standard)}`
      )
      queryClient.invalidateQueries({ queryKey: ["masters", "units"] })
    },
    onError: (e) => {
      setText(saved === null ? "" : String(saved))
      notifyError(e, "Couldn't save the size")
    },
  })
  if (unit.base_unit || !unit.whole_number)
    return <span className="text-muted-foreground">—</span>
  const commit = () => {
    const value = text.trim() === "" ? null : Number(text)
    if (value === saved) return
    if (value !== null && (!Number.isFinite(value) || value <= 0)) {
      setText(saved === null ? "" : String(saved))
      return notifyError(
        new Error(`Enter a number of ${plural(base, 2)} above zero.`)
      )
    }
    save.mutate(value)
  }
  const made = madeOf(unit, all)
  return (
    <label className="flex items-center gap-2 text-sm">
      {canEdit ? (
        <Input
          value={text}
          inputMode="numeric"
          aria-label={`Number of ${plural(base, 2)} in one ${unit.name}`}
          placeholder="—"
          disabled={save.isPending}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-24 text-right tabular-nums"
        />
      ) : (
        <span className="w-24 pr-2.5 text-right tabular-nums">
          {saved ?? "—"}
        </span>
      )}
      <span className="text-muted-foreground">
        {plural(base, saved ?? 2).toLowerCase()}
        {made && <span className="ml-1.5 text-xs">= {made}</span>}
      </span>
    </label>
  )
}

const ROW =
  "grid items-center gap-x-4 gap-y-2 px-5 py-2.5 md:min-h-14 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_8rem_4.5rem_2.25rem]"

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <>
      <li className="flex flex-wrap items-baseline gap-x-2 bg-muted/40 px-5 py-2 text-sm">
        <span className="font-semibold">{title}</span>
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </li>
      {children}
    </>
  )
}

export default function UnitsPage() {
  const queryClient = useQueryClient()
  const q = useQuery({
    queryKey: ["masters", "units"],
    queryFn: () => api.masters("units"),
  })
  const [editing, setEditing] = React.useState<Editing>(null)
  const [deleting, setDeleting] = React.useState<MasterItem | null>(null)
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["masters", "units"] })
  const toggle = useMutation({
    mutationFn: (v: { name: string; enabled: boolean }) =>
      api.setMasterEnabled("units", v.name, v.enabled),
    onSuccess: (_r, v) => {
      notifySuccess(
        v.enabled ? `${v.name} switched on` : `${v.name} switched off`
      )
      refresh()
    },
    onError: (e) => notifyError(e, "Couldn't change it"),
  })
  const remove = useMutation({
    mutationFn: (name: string) => api.deleteMaster("units", name),
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
  const base = data?.base ?? "Piece"
  const items = data?.items ?? []
  const canEdit = data?.can_edit ?? false
  const active = items.filter((u) => u.enabled)
  const baseUnit = active.filter((u) => u.base_unit)
  const packs = active.filter((u) => !u.base_unit && u.whole_number)
  const measured = active.filter((u) => !u.base_unit && !u.whole_number)
  const off = items.filter((u) => !u.enabled)

  const row = (u: MasterItem) => (
    <li key={u.name} className={ROW}>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="font-medium">{u.name}</span>
        {u.base_unit && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Base unit
          </span>
        )}
        {(u.core || u.base_unit) && (
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
              Built in: it keeps its name and can&apos;t be deleted
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      <SizeCell
        unit={u}
        all={items}
        base={base}
        canEdit={canEdit && u.enabled}
      />
      <span className="text-sm text-muted-foreground max-md:hidden">
        {u.used ? `${u.used} ${u.used === 1 ? "product" : "products"}` : "—"}
      </span>
      <span className="flex md:justify-center">
        {canEdit && !u.base_unit ? (
          <Switch
            on={u.enabled}
            label={u.enabled ? `Switch ${u.name} off` : `Switch ${u.name} on`}
            disabled={toggle.isPending}
            onChange={(enabled) => toggle.mutate({ name: u.name, enabled })}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {u.base_unit ? "Always on" : ""}
          </span>
        )}
      </span>
      <span className="flex justify-end">
        {canEdit && !u.core && !u.base_unit && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`More for ${u.name}`}
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => setEditing({ mode: "rename", name: u.name })}
              >
                <PencilIcon />
                Rename
              </DropdownMenuItem>
              {u.can_delete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleting(u)}
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
          <IconTile icon={RulerIcon} tone="violet" size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Units
            </h1>
            <p className="text-muted-foreground">
              How products are counted, bought and sold: piece, dozen, box,
              carton.
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setEditing({ mode: "add" })}>
            <PlusIcon data-icon="inline-start" />
            Add unit
          </Button>
        )}
      </div>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          Stock is counted in {plural(base, 2)}. Set the usual pack size here; a
          product can use its own size on its page.
        </span>
      </p>

      {q.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : q.error ? (
        <ErrorState
          title="Couldn't load the units"
          message={q.error.message}
          onRetry={() => q.refetch()}
          retrying={q.isFetching}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="flex flex-col divide-y">
            <li
              className={cn(
                ROW,
                "py-2 text-xs font-medium text-muted-foreground max-md:hidden"
              )}
            >
              <span>Unit</span>
              <span>Pieces in one pack</span>
              <span>Used by</span>
              <span className="text-center">On</span>
              <span />
            </li>
            {baseUnit.length > 0 && (
              <Section title="Base unit" hint="All stock is counted in it">
                {baseUnit.map(row)}
              </Section>
            )}
            {packs.length > 0 && (
              <Section title="Packs" hint="Counted in whole numbers">
                {packs.map(row)}
              </Section>
            )}
            {measured.length > 0 && (
              <Section title="Measured" hint="Can be split, like 0.5 kg">
                {measured.map(row)}
              </Section>
            )}
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

      <UnitDialog
        editing={editing}
        base={base}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && !remove.isPending && setDeleting(null)}
        title={`Delete ${deleting?.name ?? ""}?`}
        description="Nothing uses it, so nothing breaks. If you may need it again, switch it off instead."
        confirmLabel="Delete unit"
        destructive
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.name)}
      />
    </div>
  )
}
