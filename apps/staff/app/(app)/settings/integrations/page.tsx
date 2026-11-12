"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CableIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CreditCardIcon,
  FingerprintIcon,
  RotateCwIcon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import { ErrorState } from "@/components/ui-kit/error-state"
import { IconTile, type Tone } from "@/components/ui-kit/icon-tile"
import { api, type IntegrationStatus } from "@/lib/api"
import { timeAgo } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

const SERVICE_LOOK: Record<string, { icon: LucideIcon; tone: Tone }> = {
  postex: { icon: TruckIcon, tone: "amber" },
  payment_gateway: { icon: CreditCardIcon, tone: "emerald" },
  attendance: { icon: FingerprintIcon, tone: "lime" },
}

const STATUS_LOOK: Record<string, { icon: LucideIcon; className: string }> = {
  Completed: { icon: CircleCheckIcon, className: "text-success" },
  Failed: { icon: CircleXIcon, className: "text-destructive" },
  Queued: { icon: ClockIcon, className: "text-muted-foreground" },
}

function ServiceCard({ s }: { s: IntegrationStatus["services"][0] }) {
  const look = SERVICE_LOOK[s.key] ?? { icon: CableIcon, tone: "teal" }
  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <IconTile icon={look.icon} tone={look.tone} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{s.label}</span>
          <span className="text-sm text-muted-foreground">{s.purpose}</span>
        </div>
      </div>
      {/* status and last call stay at the bottom, so the three cards line up */}
      <div className="mt-auto flex flex-col gap-1.5 text-sm">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                s.connected ? "bg-success" : "bg-muted-foreground/40"
              )}
            />
            <span
              className={cn(
                "font-medium",
                !s.connected && "text-muted-foreground"
              )}
            >
              {s.connected ? "Connected" : "Coming soon"}
            </span>
          </span>
          {s.failed_7_days > 0 && (
            <span className="font-medium text-destructive">
              {s.failed_7_days} failed this week
            </span>
          )}
        </span>
        {s.connected && s.last_call && (
          <span className="text-xs text-muted-foreground">
            Last call {timeAgo(s.last_call).toLowerCase()}
          </span>
        )}
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: ["integrations"], queryFn: api.integrations })
  const retry = useMutation({
    mutationFn: api.retryIntegration,
    onSuccess: (r) => {
      if (r.ok) notifySuccess("Sent again: it worked")
      else notifyError(new Error("Sent again, but it failed again."))
      queryClient.invalidateQueries({ queryKey: ["integrations"] })
    },
    onError: (e) => notifyError(e, "Couldn't send it again"),
  })
  const data = q.data

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <div className="flex items-start gap-3">
        <IconTile icon={CableIcon} tone="teal" size="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Integrations
          </h1>
          <p className="text-muted-foreground">
            Connect couriers, payments and attendance devices.
          </p>
        </div>
      </div>

      {q.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : q.error ? (
        <ErrorState
          title="Couldn't load the integrations"
          message={q.error.message}
          onRetry={() => q.refetch()}
          retrying={q.isFetching}
        />
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {data.services.map((s) => (
              <ServiceCard key={s.key} s={s} />
            ))}
          </div>

          {data.calls.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon className="size-4" />
              Calls to these services will be listed here once one is connected.
            </p>
          ) : (
            <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
              <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b px-5 py-4">
                <IconTile icon={ClockIcon} tone="teal" size="sm" />
                <h2 className="font-heading text-base font-semibold">
                  Latest calls
                </h2>
                <span className="text-sm text-muted-foreground">
                  Every call is logged. A failed call is tried again{" "}
                  {data.max_tries} times, then you are alerted.
                </span>
              </header>
              <ul className="flex flex-col divide-y">
                {data.calls.map((c) => {
                  const look = STATUS_LOOK[c.status] ?? STATUS_LOOK.Queued!
                  return (
                    <li
                      key={c.name}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
                    >
                      <look.icon className={cn("size-4", look.className)} />
                      <div className="flex min-w-0 flex-1 basis-60 flex-col">
                        <span className="text-sm font-medium">
                          {c.service} · {c.action}
                          {c.reference && (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              · {c.reference[1]}
                            </span>
                          )}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {timeAgo(c.at)} · try {c.attempt} of {data.max_tries}
                          {c.error && ` · ${c.error}`}
                        </span>
                      </div>
                      {c.can_retry && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retry.mutate(c.name)}
                          disabled={retry.isPending}
                        >
                          {retry.isPending && retry.variables === c.name ? (
                            <Spinner data-icon="inline-start" />
                          ) : (
                            <RotateCwIcon data-icon="inline-start" />
                          )}
                          Retry
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      ) : null}
    </div>
  )
}
