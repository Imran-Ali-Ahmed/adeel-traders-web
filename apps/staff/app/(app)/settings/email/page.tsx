"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronDownIcon,
  CircleCheckIcon,
  FileTextIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { useSession } from "@/components/session"
import { ErrorState } from "@/components/ui-kit/error-state"
import { IconTile } from "@/components/ui-kit/icon-tile"
import { api, type EmailTemplateRow } from "@/lib/api"
import { documentLabel, plainLine, STARTERS } from "@/lib/email-template"
import { timeAgo } from "@/lib/format"

/** Today's date where the shop is (not UTC: after midnight in Pakistan UTC is still yesterday). */
const today = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function QueueFact({
  label,
  value,
  bad,
}: {
  label: string
  value: number | undefined
  bad?: boolean
}) {
  return (
    <div className="flex flex-col px-5 py-3">
      <span
        className={cn(
          "font-heading text-xl font-semibold tabular-nums",
          bad && value ? "text-destructive" : !value && "text-muted-foreground"
        )}
      >
        {value ?? "—"}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

function TemplateRow({ t }: { t: EmailTemplateRow }) {
  const line = plainLine(t.response)
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{t.name}</span>
          {t.reference_doctype && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {documentLabel(t.reference_doctype)}
            </span>
          )}
        </span>
        {line && (
          <span className="truncate text-sm text-muted-foreground">{line}</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground max-sm:hidden">
        Changed {timeAgo(t.modified).toLowerCase()}
      </span>
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={
          <Link
            href={`/settings/email/template?name=${encodeURIComponent(t.name)}`}
          />
        }
      >
        <PencilIcon data-icon="inline-start" />
        <span className="max-sm:sr-only">Edit</span>
      </Button>
    </li>
  )
}

export default function EmailSettingsPage() {
  const session = useSession()
  const accounts = useQuery({
    queryKey: ["email-accounts"],
    queryFn: api.emailAccounts,
  })
  const waiting = useQuery({
    queryKey: ["email-queue", "waiting"],
    queryFn: () => api.emailQueueCount({ status: "Not Sent" }),
  })
  const failed = useQuery({
    queryKey: ["email-queue", "failed"],
    queryFn: () => api.emailQueueCount({ status: "Error" }),
  })
  const sent = useQuery({
    queryKey: ["email-queue", "sent"],
    queryFn: () =>
      api.emailQueueCount({ status: "Sent", creation: [">=", today()] }),
  })
  const templates = useQuery({
    queryKey: ["email-templates"],
    queryFn: api.emailTemplates,
  })
  const company = useQuery({ queryKey: ["company"], queryFn: api.company })

  const mine = (templates.data ?? []).filter((t) => t.reference_doctype)
  const system = (templates.data ?? []).filter((t) => !t.reference_doctype)
  const outgoing = accounts.data?.find(
    (a) => a.enable_outgoing && a.default_outgoing
  )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-start gap-3">
        <IconTile icon={MailIcon} tone="rose" size="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Email
          </h1>
          <p className="text-muted-foreground">
            The account emails are sent from, what is waiting to go, and the
            wording of the emails customers and staff receive.
          </p>
        </div>
      </div>

      {accounts.isLoading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : outgoing ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4">
          <CircleCheckIcon className="size-5 text-success" />
          <div className="flex flex-col">
            <span className="font-medium">Sending is on</span>
            <span className="text-sm text-muted-foreground">
              Emails go out from {outgoing.email_id}.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/8 px-5 py-4">
          <TriangleAlertIcon className="mt-0.5 size-5 text-warning-ink" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">Sending is off</span>
            <span className="text-sm text-muted-foreground">
              No email account is set up yet, so emails wait in the queue and
              are not sent. Nesway connects the business email account (Gmail or
              your own domain) when you choose it.
              {!!waiting.data &&
                ` ${waiting.data} ${waiting.data === 1 ? "email is" : "emails are"} waiting now.`}
            </span>
          </div>
        </div>
      )}

      <section className="flex flex-col rounded-xl border bg-card">
        <header className="flex items-center gap-2.5 border-b px-5 py-4">
          <IconTile icon={SendIcon} tone="rose" size="sm" />
          <h2 className="font-heading text-base font-semibold">Email queue</h2>
        </header>
        <div className="grid grid-cols-3 divide-x">
          <QueueFact label="Waiting to send" value={waiting.data} />
          <QueueFact label="Failed" value={failed.data} bad />
          <QueueFact label="Sent today" value={sent.data} />
        </div>
      </section>

      <section className="flex flex-col rounded-xl border bg-card">
        <header className="flex flex-wrap items-center gap-2.5 border-b px-5 py-4">
          <IconTile icon={FileTextIcon} tone="rose" size="sm" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="font-heading text-base font-semibold">
              Email templates
            </h2>
            <span className="text-sm text-muted-foreground">
              The wording of the emails customers and suppliers receive. Every
              email carries the company logo at the top.
            </span>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/settings/email/template" />}
          >
            <PlusIcon data-icon="inline-start" />
            New template
          </Button>
        </header>
        {templates.isLoading ? (
          <Skeleton className="m-5 h-32 rounded-lg" />
        ) : templates.error ? (
          <div className="p-5">
            <ErrorState
              title="Couldn't load the templates"
              message={templates.error.message}
              onRetry={() => templates.refetch()}
              retrying={templates.isFetching}
            />
          </div>
        ) : (
          <>
            {mine.length === 0 ? (
              <div className="flex flex-col gap-4 px-5 py-6">
                <p className="text-sm text-muted-foreground">
                  No templates of your own yet. Start from an example and change
                  the words.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(STARTERS).map(([key, st]) => (
                    <Link
                      key={key}
                      href={`/settings/email/template?starter=${key}`}
                      className="flex flex-col gap-1.5 rounded-lg border p-3.5 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <span className="font-medium">{st.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {documentLabel(st.doctype)}
                      </span>
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {plainLine(st.body, 90)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="flex flex-col divide-y">
                {mine.map((t) => (
                  <TemplateRow key={t.name} t={t} />
                ))}
              </ul>
            )}
            {system.length > 0 && (
              <details className="group/sys border-t">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <ChevronDownIcon className="size-4 transition-transform group-open/sys:rotate-180" />
                  Built-in templates ({system.length}): used by the HR emails
                </summary>
                <ul className="flex flex-col divide-y border-t bg-muted/20">
                  {system.map((t) => (
                    <TemplateRow key={t.name} t={t} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>
    </div>
  )
}
