"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

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
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { api, type CatalogueCategory } from "@/lib/api"
import { notifyError, notifySuccess } from "@/lib/notify"

const ROOT = "All Item Groups"

type Editing =
  | { kind: "new-category" }
  | { kind: "new-brand" }
  | { kind: "rename"; doctype: "Item Group" | "Brand"; name: string }

function depthOf(c: CatalogueCategory, all: CatalogueCategory[]) {
  let depth = 0
  let parent = c.parent
  while (parent && parent !== ROOT && depth < 6) {
    depth += 1
    parent = all.find((x) => x.name === parent)?.parent ?? null
  }
  return depth
}

/** Add, rename (and for brands, remove) the catalogue lists. Changes keep product links. */
function EditDialog({
  editing,
  groups,
  onClose,
}: {
  editing: Editing | null
  groups: string[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = React.useState("")
  const [parent, setParent] = React.useState(ROOT)
  const check = useFormCheck({
    cat_name: name.trim() ? undefined : "Enter a name.",
  })

  React.useEffect(() => {
    if (!editing) return
    setName(editing.kind === "rename" ? editing.name : "")
    setParent(ROOT)
    check.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [editing])

  const mutation = useMutation({
    mutationFn: async () => {
      if (!editing) return
      if (editing.kind === "new-category")
        return api.addCategory(name.trim(), parent)
      if (editing.kind === "new-brand") return api.addBrand(name.trim())
      return api.renameCatalogue(editing.doctype, editing.name, name.trim())
    },
    onSuccess: () => {
      notifySuccess(editing?.kind === "rename" ? "Renamed" : "Added")
      queryClient.invalidateQueries({ queryKey: ["catalogue"] })
      queryClient.invalidateQueries({ queryKey: ["form-options"] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      onClose()
    },
    onError: (e) => notifyError(e),
  })

  const title =
    editing?.kind === "new-category"
      ? "Add category"
      : editing?.kind === "new-brand"
        ? "Add brand"
        : `Rename ${editing?.doctype === "Brand" ? "brand" : "category"}`

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {editing?.kind === "rename"
              ? "Every product keeps its link; only the name changes."
              : "It appears in product forms and list filters right away."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="catalogue-edit"
          noValidate
          onSubmit={(e) => check.submit(e, () => mutation.mutate())}
        >
          <FieldGroup>
            <Field data-invalid={check.invalid("cat_name")}>
              <RequiredLabel htmlFor="cat_name">Name</RequiredLabel>
              <Input
                id="cat_name"
                value={name}
                aria-invalid={check.invalid("cat_name")}
                onChange={(e) => setName(e.target.value)}
              />
              <FieldHint error={check.error("cat_name")} />
            </Field>
            {editing?.kind === "new-category" && (
              <Field>
                <RequiredLabel htmlFor="cat_parent">Inside</RequiredLabel>
                <Select
                  value={parent}
                  onValueChange={(v) => setParent(v ?? ROOT)}
                  items={Object.fromEntries(
                    [ROOT, ...groups].map((g) => [
                      g,
                      g === ROOT ? "Top level" : g,
                    ])
                  )}
                >
                  <SelectTrigger id="cat_parent" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[ROOT, ...groups].map((g) => (
                        <SelectItem key={g} value={g}>
                          {g === ROOT ? "Top level" : g}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="catalogue-edit"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner data-icon="inline-start" />}
            {editing?.kind === "rename" ? "Rename" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ListCard({
  title,
  description,
  onAdd,
  canEdit,
  children,
}: {
  title: string
  description: string
  onAdd: () => void
  canEdit: boolean
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <PlusIcon data-icon="inline-start" />
            Add
          </Button>
        )}
      </header>
      <ul className="flex flex-col divide-y">{children}</ul>
    </section>
  )
}

export default function CataloguePage() {
  const queryClient = useQueryClient()
  const catalogue = useQuery({
    queryKey: ["catalogue"],
    queryFn: api.catalogue,
  })
  const [editing, setEditing] = React.useState<Editing | null>(null)
  const remove = useMutation({
    mutationFn: (name: string) => api.deleteBrand(name),
    onSuccess: () => {
      notifySuccess("Brand removed")
      queryClient.invalidateQueries({ queryKey: ["catalogue"] })
      queryClient.invalidateQueries({ queryKey: ["form-options"] })
    },
    onError: (e) => notifyError(e),
  })

  const data = catalogue.data
  const canEdit = data?.can_edit ?? false
  const categories = data?.categories ?? []
  const groups = categories.filter((c) => c.is_group).map((c) => c.name)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Catalogue
        </h1>
        <p className="text-muted-foreground">
          Categories and brands used by every product, the shop and the website.
        </p>
      </div>
      {catalogue.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : catalogue.error ? (
        <p className="text-destructive">{catalogue.error.message}</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <ListCard
            title="Categories"
            description="Groups like Lips or Skin Care. Groups can hold other categories."
            canEdit={canEdit}
            onAdd={() => setEditing({ kind: "new-category" })}
          >
            {categories.map((c) => (
              <li
                key={c.name}
                className="flex items-center gap-3 px-5 py-2.5 text-sm"
                style={{ paddingLeft: `${20 + depthOf(c, categories) * 20}px` }}
              >
                <span className={c.is_group ? "font-semibold" : "font-medium"}>
                  {c.name}
                </span>
                {c.is_group ? (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    Group
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {c.products} {c.products === 1 ? "product" : "products"}
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename ${c.name}`}
                    onClick={() =>
                      setEditing({
                        kind: "rename",
                        doctype: "Item Group",
                        name: c.name,
                      })
                    }
                  >
                    <PencilIcon />
                  </Button>
                )}
              </li>
            ))}
          </ListCard>
          <ListCard
            title="Brands"
            description="Shown on products and used in search and filters."
            canEdit={canEdit}
            onAdd={() => setEditing({ kind: "new-brand" })}
          >
            {(data?.brands ?? []).length === 0 && (
              <li className="px-5 py-4 text-sm text-muted-foreground">
                No brands yet. Add the brands you sell.
              </li>
            )}
            {(data?.brands ?? []).map((b) => (
              <li
                key={b.name}
                className="flex items-center gap-3 px-5 py-2.5 text-sm"
              >
                <span className="font-medium">{b.name}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {b.products} {b.products === 1 ? "product" : "products"}
                </span>
                {canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rename ${b.name}`}
                      onClick={() =>
                        setEditing({
                          kind: "rename",
                          doctype: "Brand",
                          name: b.name,
                        })
                      }
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${b.name}`}
                      title={
                        b.products
                          ? "Used by products; change them first"
                          : `Remove ${b.name}`
                      }
                      disabled={b.products > 0 || remove.isPending}
                      onClick={() => remove.mutate(b.name)}
                    >
                      <Trash2Icon />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ListCard>
        </div>
      )}
      <EditDialog
        editing={editing}
        groups={groups}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
