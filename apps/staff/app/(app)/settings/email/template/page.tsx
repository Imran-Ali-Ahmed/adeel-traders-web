"use client"

import * as React from "react"
import { Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeftIcon, InfoIcon, MailIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
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
import { Textarea } from "@workspace/ui/components/textarea"

import { EmailPreview } from "@/components/email/email-preview"
import { RichText } from "@/components/email/rich-text"
import { useSession } from "@/components/session"
import { ErrorState } from "@/components/ui-kit/error-state"
import {
  FieldHint,
  RequiredLabel,
  useFormCheck,
} from "@/components/ui-kit/form"
import { IconTile } from "@/components/ui-kit/icon-tile"
import { api } from "@/lib/api"
import { DOCUMENT_TYPES, STARTERS, insertables } from "@/lib/email-template"
import { notifyError, notifySuccess } from "@/lib/notify"

type Draft = { name: string; doctype: string; subject: string; body: string }

/**
 * One email template on a page of its own, written for people who do not code: a visual editor
 * with "Add information" chips (Customer name, Total amount), a live preview with sample details,
 * and nothing technical on screen. Frappe's own Email Template record holds the result, and
 * Frappe fills in the real details when the email is sent.
 *
 * ERPNext's built-in templates (HR emails) have no "used for" and are full HTML: for those only
 * the subject is easy to change, and the HTML is behind an "advanced" button.
 */
function TemplateEditor() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const session = useSession()
  const params = useSearchParams()
  const name = params.get("name")
  const starter = STARTERS[params.get("starter") ?? ""]
  const isNew = name === null

  const existing = useQuery({
    queryKey: ["email-template", name],
    queryFn: () => api.emailTemplate(name!),
    enabled: !isNew,
  })
  const company = useQuery({
    queryKey: ["company"],
    queryFn: api.company,
    retry: false, // the logo needs the Company page; without it the company name is shown
  })
  const loaded = existing.data
  const isSystem = !isNew && !!loaded && !loaded.reference_doctype

  const initial: Draft | null = isNew
    ? {
        name: starter?.title ?? "",
        doctype: starter?.doctype ?? "",
        subject: starter?.subject ?? "",
        body: starter?.body ?? "",
      }
    : loaded
      ? {
          name: loaded.name,
          doctype: loaded.reference_doctype ?? "",
          subject: loaded.subject ?? "",
          body:
            (loaded.use_html ? loaded.response_html : loaded.response) ?? "",
        }
      : null
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const current = draft ?? initial
  const [showHtml, setShowHtml] = React.useState(false)

  const fields = useQuery({
    queryKey: ["doc-fields", current?.doctype],
    queryFn: () => api.docFields(current!.doctype),
    enabled: !!current?.doctype,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const items = React.useMemo(
    () => insertables(fields.data ?? []),
    [fields.data]
  )
  const types = React.useMemo(
    () =>
      Object.fromEntries(
        (fields.data ?? []).map((f) => [f.fieldname, f.fieldtype])
      ),
    [fields.data]
  )

  const set = (patch: Partial<Draft>) =>
    current && setDraft({ ...current, ...patch })
  const bodyText = (current?.body ?? "").replace(/<[^>]*>/g, "").trim()
  const check = useFormCheck({
    et_name:
      isNew && !current?.name.trim() ? "Give the template a name." : undefined,
    et_type:
      !isSystem && !current?.doctype
        ? "Choose what this email is for."
        : undefined,
    et_subject: !current?.subject.trim() ? "Write the subject." : undefined,
    et_body: !bodyText ? "Write the message." : undefined,
  })
  const save = useMutation({
    mutationFn: () =>
      api.saveEmailTemplate(
        current!.name.trim(),
        {
          subject: current!.subject.trim(),
          body: current!.body,
          reference_doctype: current!.doctype,
        },
        isNew,
        Boolean(loaded?.use_html)
      ),
    onSuccess: () => {
      notifySuccess(isNew ? "Template added" : "Template saved")
      queryClient.invalidateQueries({ queryKey: ["email-templates"] })
      queryClient.invalidateQueries({ queryKey: ["email-template", name] })
      router.push("/settings/email")
    },
    onError: (e) => notifyError(e, "Couldn't save the template"),
  })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-0 md:p-8 md:pb-0">
      <div className="flex flex-col gap-3">
        <Link
          href="/settings/email"
          className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <ArrowLeftIcon className="size-4" />
          Email
        </Link>
        <div className="flex items-start gap-3">
          <IconTile icon={MailIcon} tone="rose" size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {isNew ? "New email template" : name}
            </h1>
            <p className="text-muted-foreground">
              Write the email once. The customer&apos;s details are filled in by
              themselves each time it is sent.
            </p>
          </div>
        </div>
      </div>

      {!isNew && existing.error ? (
        <ErrorState
          title="Couldn't open this template"
          message={existing.error.message}
          onRetry={() => existing.refetch()}
          retrying={existing.isFetching}
        />
      ) : !current ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <form
          id="email-template-form"
          noValidate
          onSubmit={(e) => check.submit(e, () => save.mutate())}
          className="grid items-start gap-6 lg:grid-cols-2"
        >
          <section className="flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-5">
            {isSystem && (
              <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                <InfoIcon className="mt-0.5 size-4 shrink-0" />
                This is a built-in template, used by the HR emails. You can
                change the subject and the words. The layout is written in HTML,
                so it stays behind the advanced button.
              </p>
            )}
            <FieldGroup>
              {isNew && (
                <Field data-invalid={check.invalid("et_name")}>
                  <RequiredLabel htmlFor="et_name">Name</RequiredLabel>
                  <Input
                    id="et_name"
                    value={current.name}
                    placeholder="Order confirmed"
                    onChange={(e) => set({ name: e.target.value })}
                    aria-invalid={check.invalid("et_name")}
                  />
                  <FieldHint
                    error={check.error("et_name")}
                    hint="A short name only your team sees."
                  />
                </Field>
              )}
              {!isSystem && (
                <Field data-invalid={check.invalid("et_type")}>
                  <RequiredLabel htmlFor="et_type">
                    What is this email for?
                  </RequiredLabel>
                  <Select
                    value={current.doctype}
                    onValueChange={(v) => set({ doctype: String(v ?? "") })}
                    items={Object.fromEntries(
                      DOCUMENT_TYPES.map((d) => [d.doctype, d.label])
                    )}
                  >
                    <SelectTrigger
                      id="et_type"
                      className="w-full"
                      aria-invalid={check.invalid("et_type")}
                    >
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {DOCUMENT_TYPES.map((d) => (
                          <SelectItem key={d.doctype} value={d.doctype}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldHint
                    error={check.error("et_type")}
                    hint="This decides which details you can add, like the customer's name or the total."
                  />
                </Field>
              )}
              <Field data-invalid={check.invalid("et_subject")}>
                <RequiredLabel htmlFor="et_subject">Subject</RequiredLabel>
                {isSystem ? (
                  <Input
                    id="et_subject"
                    value={current.subject}
                    onChange={(e) => set({ subject: e.target.value })}
                    aria-invalid={check.invalid("et_subject")}
                  />
                ) : (
                  <RichText
                    id="et_subject"
                    variant="line"
                    ariaLabel="Subject"
                    value={current.subject}
                    onChange={(subject) => set({ subject })}
                    items={items}
                    hasType={!!current.doctype}
                    invalid={check.invalid("et_subject")}
                  />
                )}
                <FieldHint error={check.error("et_subject")} />
              </Field>
              <Field data-invalid={check.invalid("et_body")}>
                <RequiredLabel htmlFor="et_body">Message</RequiredLabel>
                {isSystem ? (
                  <>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHtml(!showHtml)}
                      >
                        {showHtml
                          ? "Hide the HTML"
                          : "Edit the HTML (advanced)"}
                      </Button>
                    </div>
                    {showHtml && (
                      <Textarea
                        id="et_body"
                        value={current.body}
                        onChange={(e) => set({ body: e.target.value })}
                        aria-invalid={check.invalid("et_body")}
                        className="field-sizing-fixed h-80 resize-none overflow-auto font-mono text-xs"
                      />
                    )}
                  </>
                ) : (
                  <RichText
                    id="et_body"
                    variant="body"
                    ariaLabel="Message"
                    placeholder="Dear Customer name, …"
                    value={current.body}
                    onChange={(body) => set({ body })}
                    items={items}
                    hasType={!!current.doctype}
                    invalid={check.invalid("et_body")}
                  />
                )}
                <FieldHint error={check.error("et_body")} />
              </Field>
            </FieldGroup>
          </section>

          <section className="min-w-0 rounded-xl border bg-card p-5 lg:sticky lg:top-20">
            <EmailPreview
              subject={current.subject}
              body={current.body}
              logo={company.data?.logo ?? null}
              company={company.data?.details.name ?? session.company}
              types={types}
            />
          </section>
        </form>
      )}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/settings/email" />}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="email-template-form"
          disabled={save.isPending}
        >
          {save.isPending && <Spinner data-icon="inline-start" />}
          {isNew ? "Add template" : "Save template"}
        </Button>
      </div>
    </div>
  )
}

export default function EmailTemplatePage() {
  return (
    <Suspense>
      <TemplateEditor />
    </Suspense>
  )
}
