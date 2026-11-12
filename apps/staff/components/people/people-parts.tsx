"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import {
  ActivityIcon,
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  LockIcon,
  LockKeyholeIcon,
  LogOutIcon,
  MapPinIcon,
  MonitorSmartphoneIcon,
  ShieldAlertIcon,
  UnlockIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { ConfirmDialog } from "@/components/ui-kit/confirm-dialog"
import { IconTile } from "@/components/ui-kit/icon-tile"
import { api, type PersonAccess, type PersonRole } from "@/lib/api"
import { timeAgo } from "@/lib/format"
import { notifyError, notifySuccess } from "@/lib/notify"

/** Active (green dot) or Disabled (grey dot). */
export function PersonStatus({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        enabled
          ? "bg-success/12 text-success"
          : "bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          enabled ? "bg-success" : "bg-muted-foreground/60"
        )}
      />
      {enabled ? "Active" : "Disabled"}
    </span>
  )
}

/** The roles a person has, as small chips. */
export function RoleChips({ roles }: { roles: PersonRole[] }) {
  if (roles.length === 0) {
    return <span className="text-sm text-muted-foreground">No role</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <span
          key={r.key}
          className={cn(
            "rounded-md px-1.5 py-0.5 text-xs font-medium",
            r.built_in
              ? "bg-chart-1/10 text-chart-1"
              : "bg-chart-7/10 text-chart-7"
          )}
        >
          {r.label}
        </span>
      ))}
    </span>
  )
}

/** "Shop Counter" with a pin, or "All branches". */
export function BranchLabel({ branches }: { branches: string[] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <MapPinIcon className="size-3.5 text-chart-6" />
      {branches.length ? branches.join(", ") : "All branches"}
    </span>
  )
}

/**
 * Pick roles by clicking chips (more than one allowed). The Owner role asks for a confirmation,
 * because it can do everything; the server refuses it without that confirmation too.
 */
export function RolePicker({
  options,
  value,
  onChange,
}: {
  options: PersonRole[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Roles">
      {options.map((r) => {
        const on = value.includes(r.key)
        return (
          <button
            key={r.key}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(
                on ? value.filter((k) => k !== r.key) : [...value, r.key]
              )
            }
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              on
                ? "bg-foreground font-medium text-background ring-foreground"
                : "bg-card text-foreground ring-border hover:bg-muted"
            )}
          >
            {on && <CheckIcon className="size-3.5" />}
            {r.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Where a person works: tick one or more branches. Nothing ticked means all branches, shown as
 * its own chip so the choice is always visible.
 */
export function BranchPicker({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  const chip = (on: boolean) =>
    cn(
      "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
      on
        ? "bg-foreground font-medium text-background ring-foreground"
        : "bg-card text-foreground ring-border hover:bg-muted"
    )
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Works at">
      <button
        type="button"
        aria-pressed={value.length === 0}
        onClick={() => onChange([])}
        className={chip(value.length === 0)}
      >
        {value.length === 0 && <CheckIcon className="size-3.5" />}
        All branches
      </button>
      {options.map((b) => {
        const on = value.includes(b)
        return (
          <button
            key={b}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(on ? value.filter((x) => x !== b) : [...value, b])
            }
            className={chip(on)}
          >
            {on ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <MapPinIcon className="size-3.5 text-chart-6" />
            )}
            {b}
          </button>
        )
      })}
    </div>
  )
}

/** Shown once after a login is made or a password is reset: the temporary password to hand over. */
export function TempPassword({
  name,
  password,
}: {
  name: string
  password: string
}) {
  const [copied, setCopied] = React.useState(false)
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4">
      <span className="flex items-center gap-2 text-sm font-medium">
        <KeyRoundIcon className="size-4 text-chart-4" />
        Temporary password for {name}
      </span>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-card px-3 py-2 font-mono text-base tracking-wide ring-1 ring-border select-all">
          {password}
        </code>
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard?.writeText(password)
            setCopied(true)
          }}
        >
          {copied ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <CopyIcon data-icon="inline-start" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Give it to them in person. It is shown only now. At their first login
        they choose their own password.
      </p>
    </div>
  )
}

/**
 * Access & security: the four things an owner can act on, each with its action next to it.
 * Replaces a raw list of logins, which told the owner nothing they could do anything about.
 */
export function AccessCard({
  user,
  name,
  isYou,
  access,
  onChanged,
}: {
  user: string
  name: string
  isYou: boolean
  access: PersonAccess
  onChanged: () => void
}) {
  const [confirmLogOut, setConfirmLogOut] = React.useState(false)
  const logOut = useMutation({
    mutationFn: () => api.logOutEverywhere(user),
    onSuccess: (out) => {
      setConfirmLogOut(false)
      notifySuccess(
        "Signed out everywhere",
        `${name} was signed out on ${out.signed_out} ${out.signed_out === 1 ? "device" : "devices"}.`
      )
      onChanged()
    },
    onError: (e) => notifyError(e, "Couldn't sign them out"),
  })
  const unlock = useMutation({
    mutationFn: () => api.unlockLogin(user),
    onSuccess: () => {
      notifySuccess("Login unlocked", `${name} can try again now.`)
      onChanged()
    },
    onError: (e) => notifyError(e, "Couldn't unlock"),
  })

  const usedDays = access.days.filter((d) => d.logins > 0).length
  const most = Math.max(1, ...access.days.map((d) => d.logins))
  const signedIn = access.sessions.length
  const today = access.days.at(-1)?.date
  // One word for the whole card, from the same facts the rows show.
  const summary = access.locked
    ? { label: "Locked", className: "bg-destructive/10 text-destructive" }
    : access.temporary_password || access.failed_today
      ? { label: "Needs a look", className: "bg-warning/12 text-warning-ink" }
      : { label: "All good", className: "bg-success/12 text-success" }

  return (
    <section className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-center gap-2.5 border-b px-5 py-4">
        <IconTile icon={LockKeyholeIcon} tone="lime" size="sm" />
        <h2 className="font-heading text-base font-semibold">
          Access &amp; security
        </h2>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
            summary.className
          )}
        >
          {summary.label}
        </span>
      </header>
      <ul className="flex flex-col divide-y">
        {/* signed in now */}
        <li className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-4">
          <IconTile
            icon={MonitorSmartphoneIcon}
            tone={signedIn ? "emerald" : "lime"}
            size="sm"
            className="mt-0.5"
          />
          <div className="flex min-w-0 flex-[1_1_70%] flex-col gap-0.5">
            <span className="text-sm font-medium">
              {signedIn
                ? `Signed in on ${signedIn} ${signedIn === 1 ? "device" : "devices"}`
                : "Not signed in now"}
            </span>
            <span className="text-xs text-muted-foreground">
              {signedIn
                ? `Last active ${timeAgo(access.sessions[0]!.last_active).toLowerCase()}${access.sessions[0]!.ip ? ` from ${access.sessions[0]!.ip}` : ""}`
                : `Last login ${timeAgo(access.last_login).toLowerCase()}`}
            </span>
          </div>
          {signedIn > 0 && !isYou && (
            <Button
              variant="outline"
              size="sm"
              className="ml-11 basis-auto"
              onClick={() => setConfirmLogOut(true)}
            >
              <LogOutIcon data-icon="inline-start" />
              Log out everywhere
            </Button>
          )}
        </li>

        {/* usage */}
        <li className="flex items-start gap-3 px-5 py-4">
          <IconTile
            icon={ActivityIcon}
            tone="lime"
            size="sm"
            className="mt-0.5"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                Used the app on {usedDays} of the last 7 days
              </span>
              <span className="text-xs text-muted-foreground">
                Number of logins each day
              </span>
            </span>
            <span className="flex h-10 items-end gap-1.5" aria-hidden>
              {access.days.map((d) => (
                <span
                  key={d.date}
                  className="flex h-full flex-1 items-end"
                  title={`${dayName(d.date, "long")}: ${d.logins} ${d.logins === 1 ? "login" : "logins"}`}
                >
                  <span
                    className={cn(
                      "w-full rounded-sm",
                      d.logins
                        ? d.date === today
                          ? "bg-chart-8"
                          : "bg-chart-8/60"
                        : "bg-muted"
                    )}
                    style={{
                      height: `${Math.max(8, (d.logins / most) * 100)}%`,
                    }}
                  />
                </span>
              ))}
            </span>
            <span className="flex gap-1.5 text-xs text-muted-foreground">
              {access.days.map((d) => (
                <span
                  key={d.date}
                  className={cn(
                    "flex-1 text-center",
                    d.date === today && "font-semibold text-foreground"
                  )}
                >
                  {d.date === today ? "Today" : dayName(d.date, "short")}
                </span>
              ))}
            </span>
          </div>
        </li>

        {/* password */}
        <li className="flex items-start gap-3 px-5 py-4">
          <IconTile
            icon={KeyRoundIcon}
            tone={access.temporary_password ? "amber" : "emerald"}
            size="sm"
            className="mt-0.5"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-medium">
              {access.temporary_password
                ? "Still on the temporary password"
                : access.password_changed_on
                  ? "Chose their own password"
                  : "Password never changed"}
            </span>
            <span className="text-xs text-muted-foreground">
              {access.temporary_password
                ? "They will be asked to choose their own at the next login."
                : access.password_changed_on
                  ? `Changed ${timeAgo(access.password_changed_on).toLowerCase()}`
                  : "Set when the login was made."}
            </span>
          </div>
        </li>

        {/* wrong passwords */}
        <li className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-4">
          <IconTile
            icon={access.locked ? LockIcon : ShieldAlertIcon}
            tone={
              access.locked ? "rose" : access.failed_today ? "amber" : "emerald"
            }
            size="sm"
            className="mt-0.5"
          />
          <div className="flex min-w-0 flex-[1_1_70%] flex-col gap-0.5">
            <span
              className={cn(
                "text-sm font-medium",
                access.locked && "text-destructive"
              )}
            >
              {access.locked
                ? "Locked: too many wrong passwords"
                : access.failed_7_days
                  ? `${access.failed_7_days} wrong ${access.failed_7_days === 1 ? "password" : "passwords"} this week`
                  : "No wrong passwords this week"}
            </span>
            <span className="text-xs text-muted-foreground">
              {access.locked && access.locked_until
                ? `Can try again at ${new Date(access.locked_until.replace(" ", "T")).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}, or unlock now.`
                : access.failed_today
                  ? `${access.failed_today} today. If it was not them, reset the password.`
                  : "Nobody has been guessing this password."}
            </span>
          </div>
          {access.locked && (
            <Button
              variant="outline"
              size="sm"
              className="ml-11 basis-auto"
              disabled={unlock.isPending}
              onClick={() => unlock.mutate()}
            >
              <UnlockIcon data-icon="inline-start" />
              Unlock
            </Button>
          )}
        </li>
      </ul>
      <ConfirmDialog
        open={confirmLogOut}
        onOpenChange={setConfirmLogOut}
        title={`Log ${name} out everywhere?`}
        description={`They are signed out on ${signedIn} ${signedIn === 1 ? "device" : "devices"} now and must log in again. Their password stays the same.`}
        confirmLabel="Log out everywhere"
        pending={logOut.isPending}
        onConfirm={() => logOut.mutate()}
      />
    </section>
  )
}

/** "Mon" or "Monday" for a server date like "2026-11-12", read as a local date. */
function dayName(date: string, length: "short" | "long") {
  return new Date(`${date}T00:00`).toLocaleDateString("en-GB", {
    weekday: length,
  })
}
