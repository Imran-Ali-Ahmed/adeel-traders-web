"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BuildingIcon,
  CheckIcon,
  HistoryIcon,
  ImageIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  StoreIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
  WarehouseIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"

import { BranchDialog } from "@/components/company/branch-dialog"
import { ConfirmDialog } from "@/components/ui-kit/confirm-dialog"
import { ErrorState } from "@/components/ui-kit/error-state"
import { FieldHint, useFormCheck } from "@/components/ui-kit/form"
import { HistoryCard } from "@/components/ui-kit/history-panel"
import { IconTile } from "@/components/ui-kit/icon-tile"
import { api, type CompanyBranch, type CompanyPage } from "@/lib/api"
import { uploadFile } from "@/lib/frappe"
import { shortWarehouse } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

type Details = {
  company_name: string
  tax_id: string
  phone_no: string
  email: string
  website: string
  address_line1: string
  city: string
}

function fromServer(c: CompanyPage): Details {
  return {
    company_name: c.details.name,
    tax_id: c.details.tax_id,
    phone_no: c.details.phone_no,
    email: c.details.email,
    website: c.details.website,
    address_line1: c.address.address_line1,
    city: c.address.city,
  }
}

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]

/** The logo: preview, upload or change, remove. Used on invoices, receipts and emails. */
function LogoCard({ logo, company }: { logo: string | null; company: string }) {
  const queryClient = useQueryClient()
  const input = React.useRef<HTMLInputElement>(null)
  const set = useMutation({
    mutationFn: async (file: File | null) => {
      if (!file) return api.setCompanyLogo(null)
      if (!LOGO_TYPES.includes(file.type)) {
        throw new Error("Use a PNG, JPG, WebP or SVG image for the logo.")
      }
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("The logo is larger than 2 MB. Use a smaller image.")
      }
      const uploaded = await uploadFile(file, {
        doctype: "Company",
        name: company,
      })
      return api.setCompanyLogo(uploaded.file_url)
    },
    onSuccess: (out) => {
      notifySuccess(out.logo ? "Logo saved" : "Logo removed")
      queryClient.invalidateQueries({ queryKey: ["company"] })
    },
    onError: (e) => notifyError(e, "Couldn't save the logo"),
  })
  return (
    <section className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-center gap-2.5 border-b px-5 py-4">
        <IconTile icon={ImageIcon} tone="amber" size="sm" />
        <h2 className="font-heading text-base font-semibold">Logo</h2>
      </header>
      <div className="flex flex-col items-center gap-4 p-5">
        <div className="flex size-32 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- served by Frappe, any size
            <img
              src={logo}
              alt="Company logo"
              className="size-full object-contain p-2"
            />
          ) : (
            <BuildingIcon className="size-10 text-muted-foreground/50" />
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={LOGO_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) set.mutate(file)
            e.target.value = ""
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={set.isPending}
            onClick={() => input.current?.click()}
          >
            {set.isPending && <Spinner data-icon="inline-start" />}
            {logo ? "Change logo" : "Upload logo"}
          </Button>
          {logo && (
            <Button
              variant="ghost"
              disabled={set.isPending}
              onClick={() => set.mutate(null)}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          PNG, JPG, WebP or SVG, up to 2 MB. Shown on invoices, receipts and
          emails.
        </p>
      </div>
    </section>
  )
}

function BranchRow({
  branch,
  onEdit,
}: {
  branch: CompanyBranch
  onEdit: () => void
}) {
  const where = [branch.address.address_line1, branch.address.city]
    .filter(Boolean)
    .join(", ")
  return (
    <li className="flex items-start gap-4 px-5 py-4 md:items-center">
      <IconTile icon={StoreIcon} tone="teal" />
      {/* Phones: name, then chips underneath; Edit stays top right. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-col gap-0.5 md:flex-1">
          <span className="font-medium">{branch.name}</span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="size-3.5 shrink-0" />
            {where || "No address yet"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {branch.warehouses.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1"
            >
              <WarehouseIcon className="size-3.5 text-chart-6" />
              {shortWarehouse(w)}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
            <UsersRoundIcon className="size-3.5 text-chart-8" />
            {branch.people} {branch.people === 1 ? "person" : "people"}
          </span>
          {branch.cost_center ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-1 text-success"
              title={`Sales and expenses are booked to ${branch.cost_center}`}
            >
              <CheckIcon className="size-3.5" />
              Own accounts
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-warning/12 px-2 py-1 text-warning-ink"
              title="This branch has no accounts (cost center) yet. Ask Nesway to add one before it sells."
            >
              <TriangleAlertIcon className="size-3.5" />
              No accounts yet
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onEdit}
        aria-label={`Edit ${branch.name}`}
        className="-mt-1 md:mt-0"
      >
        <PencilIcon data-icon="inline-start" />
        <span className="max-md:sr-only">Edit</span>
      </Button>
    </li>
  )
}

export default function CompanyPage() {
  const queryClient = useQueryClient()
  const company = useQuery({ queryKey: ["company"], queryFn: api.company })
  const data = company.data
  const [draft, setDraft] = React.useState<Details | null>(null)
  const [editing, setEditing] = React.useState<CompanyBranch | "new" | null>(
    null
  )

  const saved = data ? fromServer(data) : null
  const current = draft ?? saved
  const dirty =
    draft !== null &&
    saved !== null &&
    JSON.stringify(draft) !== JSON.stringify(saved)

  const [confirmRename, setConfirmRename] = React.useState(false)
  const renaming =
    !!current && !!saved && current.company_name.trim() !== saved.company_name
  const save = useMutation({
    mutationFn: () => api.updateCompany(current!),
    onSuccess: () => {
      notifySuccess(renaming ? "Company renamed" : "Company details saved")
      setDraft(null)
      setConfirmRename(false)
      check.reset()
      queryClient.invalidateQueries({ queryKey: ["company"] })
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
    onError: (e) => {
      setConfirmRename(false)
      notifyError(e, "Couldn't save")
    },
  })

  // Street and city go together (an address needs both). The phone needs no address.
  const line1 = current?.address_line1.trim() ?? ""
  const city = current?.city.trim() ?? ""
  const name = current?.company_name.trim() ?? ""
  const check = useFormCheck({
    co_company_name:
      name.length < 2 || name.length > 80
        ? "Enter a company name of 2 to 80 characters."
        : undefined,
    co_email:
      current?.email.trim() && !/^\S+@\S+\.\S+$/.test(current.email.trim())
        ? "Enter an email like sales@example.com."
        : undefined,
    co_address_line1:
      !line1 && city ? "Enter the street address as well." : undefined,
    co_city: line1 && !city ? "Enter the city as well." : undefined,
  })

  if (company.error) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
        <ErrorState
          title="Couldn't load the company"
          message={company.error.message}
          onRetry={() => company.refetch()}
          retrying={company.isFetching}
        />
      </div>
    )
  }
  if (!data || !current) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  const update = (patch: Partial<Details>) => setDraft({ ...current, ...patch })
  const field = (
    key: keyof Details,
    label: string,
    placeholder: string,
    type = "text"
  ) => (
    <Field data-invalid={check.invalid(`co_${key}`)}>
      <FieldLabel htmlFor={`co_${key}`}>{label}</FieldLabel>
      <Input
        id={`co_${key}`}
        type={type}
        value={current[key]}
        placeholder={placeholder}
        aria-invalid={check.invalid(`co_${key}`)}
        onChange={(e) => update({ [key]: e.target.value })}
      />
      <FieldHint error={check.error(`co_${key}`)} />
    </Field>
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Company
        </h1>
        <p className="text-muted-foreground">
          Your business details, logo and branches. Used on invoices, receipts
          and reports.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex flex-col rounded-xl border bg-card">
          <header className="flex items-center gap-2.5 border-b px-5 py-4">
            <IconTile icon={BuildingIcon} tone="amber" size="sm" />
            <h2 className="font-heading text-base font-semibold">
              {data.details.name}
            </h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {data.details.country} · {data.details.currency}
            </span>
          </header>
          <form
            id="company-form"
            className="p-5"
            noValidate
            onSubmit={(e) =>
              check.submit(e, () =>
                renaming ? setConfirmRename(true) : save.mutate()
              )
            }
          >
            <FieldGroup>
              {field("company_name", "Company name", "Business name")}
              <div className="grid gap-4 sm:grid-cols-2">
                {field("tax_id", "NTN (tax number)", "1234567-8")}
                {field("phone_no", "Phone", "0300-1234567", "tel")}
                {field("email", "Email", "info@example.com", "email")}
                {field("website", "Website", "example.com")}
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                {field("address_line1", "Address", "Street and building")}
                {field("city", "City", "City")}
              </div>
            </FieldGroup>
          </form>
          {dirty && (
            <footer className="flex items-center justify-end gap-2 border-t bg-muted/40 px-5 py-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDraft(null)
                  check.reset()
                }}
              >
                Discard
              </Button>
              <Button
                type="submit"
                form="company-form"
                disabled={save.isPending}
              >
                {save.isPending && <Spinner data-icon="inline-start" />}
                Save changes
              </Button>
            </footer>
          )}
        </section>

        <LogoCard logo={data.logo} company={data.details.name} />
      </div>

      <section className="flex flex-col rounded-xl border bg-card">
        <header className="flex flex-wrap items-start gap-x-2.5 gap-y-3 border-b px-5 py-4">
          <IconTile icon={StoreIcon} tone="teal" size="sm" className="mt-0.5" />
          <div className="flex min-w-0 flex-1 basis-56 flex-col">
            <h2 className="font-heading text-base font-semibold">Branches</h2>
            <span className="text-sm text-muted-foreground">
              Each branch has its own stock location and accounts. Branches are
              never deleted, only renamed.
            </span>
          </div>
          <Button
            variant="outline"
            className="ml-auto"
            onClick={() => setEditing("new")}
          >
            <PlusIcon data-icon="inline-start" />
            Add branch
          </Button>
        </header>
        {data.branches.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No branches yet. Add your first shop or warehouse.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {data.branches.map((b) => (
              <BranchRow key={b.name} branch={b} onEdit={() => setEditing(b)} />
            ))}
          </ul>
        )}
        <footer className="flex flex-wrap items-center gap-2 border-t bg-muted/40 px-5 py-3.5 text-sm">
          <span className="text-muted-foreground">Shared by every branch:</span>
          {data.shared_locations.map((w) => (
            <span
              key={w}
              className="inline-flex items-center gap-1.5 rounded-md bg-card px-2 py-1 ring-1 ring-border"
            >
              <WarehouseIcon className="size-3.5 text-muted-foreground" />
              {shortWarehouse(w)}
            </span>
          ))}
        </footer>
      </section>

      <ConfirmDialog
        open={confirmRename}
        onOpenChange={(open) => !save.isPending && setConfirmRename(open)}
        title={`Rename the company to ${name}?`}
        description={
          <>
            Every record follows: invoices, stock, accounts and reports will
            show the new name. The short code{" "}
            <span className="font-medium text-foreground">
              {data.details.abbr}
            </span>{" "}
            on accounts stays the same. This can take a minute; keep the page
            open.
          </>
        }
        confirmLabel="Rename company"
        pending={save.isPending}
        onConfirm={() => save.mutate()}
      />

      <HistoryCard
        doctype="Company"
        name={data.details.name}
        icon={HistoryIcon}
        tone="amber"
        description="Who changed the business details and logo, and when."
      />

      <BranchDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        branch={editing && editing !== "new" ? editing : undefined}
      />
    </div>
  )
}
