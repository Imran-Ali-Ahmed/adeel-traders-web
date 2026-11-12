"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  BadgeDollarSignIcon,
  ChevronRightIcon,
  LockIcon,
  PlusIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { NewRoleDialog } from "@/components/roles/new-role-dialog"
import { IconTile, TONES, type Tone } from "@/components/ui-kit/icon-tile"
import {
  AREA_STYLE,
  LevelMeter,
  PeopleStack,
  SWITCH_STYLE,
} from "@/components/roles/role-parts"
import { api, type RoleSummary } from "@/lib/api"

/** One fact in the strip at the top: a number, what it counts, and who it is. */
function Fact({
  icon,
  tone,
  label,
  value,
  detail,
  isPrivate,
}: {
  icon: LucideIcon
  tone: Tone
  label: string
  value: React.ReactNode
  detail: string
  isPrivate?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-5 py-4">
      <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <IconTile icon={icon} tone={tone} size="sm" />
        {label}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {isPrivate && (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            <LockIcon className="size-3" />
            Private
          </span>
        )}
      </span>
      <span className="truncate text-sm text-muted-foreground" title={detail}>
        {detail}
      </span>
    </div>
  )
}

export default function RolesPage() {
  const router = useRouter()
  const roles = useQuery({ queryKey: ["roles"], queryFn: api.roles })
  const [creating, setCreating] = React.useState(false)
  const all = roles.data?.roles ?? []
  const registry = roles.data?.registry ?? []
  const switches = roles.data?.switches ?? []

  const seesCost = all.filter((r) => r.flags.cost)
  const changesPrices = all.filter((r) => r.levels.prices === "change")
  const people = new Set(all.flatMap((r) => r.people.map((p) => p.user))).size
  const names = (list: RoleSummary[]) =>
    list.map((r) => r.label).join(", ") || "No role"
  const groups = [
    {
      title: "Built-in roles",
      hint: "Ready to use. Copy one to change it.",
      icon: LockIcon,
      tone: "cobalt" as Tone,
      roles: all.filter((r) => r.built_in),
    },
    {
      title: "Your roles",
      hint: "Roles you made for your own jobs.",
      icon: ShieldCheckIcon,
      tone: "fuchsia" as Tone,
      roles: all.filter((r) => !r.built_in),
    },
  ]
  const open = (role: RoleSummary) =>
    `/settings/roles/${encodeURIComponent(role.name)}`

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Roles & permissions
          </h1>
          <p className="text-muted-foreground">
            Choose what each kind of staff member can see and do.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon data-icon="inline-start" />
          New role
        </Button>
      </div>

      {roles.isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : roles.error ? (
        <p className="text-destructive">{roles.error.message}</p>
      ) : (
        <>
          <div className="grid divide-y rounded-xl border bg-card md:grid-cols-3 md:divide-x md:divide-y-0">
            <Fact
              icon={UsersIcon}
              tone="cobalt"
              label="People with a role"
              value={people}
              detail={`Across ${all.length} roles`}
            />
            <Fact
              icon={LockIcon}
              tone="violet"
              label="Can see cost and margin"
              value={`${seesCost.length} roles`}
              detail={names(seesCost)}
              isPrivate
            />
            <Fact
              icon={BadgeDollarSignIcon}
              tone="emerald"
              label="Can change selling prices"
              value={`${changesPrices.length} roles`}
              detail={names(changesPrices)}
            />
          </div>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-heading text-lg font-semibold">
                Who can do what
              </h2>
              <p className="text-sm text-muted-foreground">
                More bars means more access. Amber marks access that is hard to
                undo. Click a role to open it.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[64rem] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="px-5 py-2.5 font-medium">Role</th>
                      <th className="px-3 py-2.5 font-medium">People</th>
                      {registry.map((a) => {
                        const style = AREA_STYLE[a.area]
                        return (
                          <th key={a.area} className="px-3 py-2.5 font-medium">
                            <span
                              className="inline-flex items-center gap-1.5"
                              title={a.label}
                            >
                              {style && (
                                <style.icon
                                  className={`size-3.5 ${TONES[style.tone].text}`}
                                />
                              )}
                              {a.short}
                            </span>
                          </th>
                        )
                      })}
                      <th className="px-3 py-2.5 font-medium">Extras</th>
                      <th className="w-8" aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {groups.map((group) =>
                      group.roles.length === 0 ? null : (
                        <React.Fragment key={group.title}>
                          <tr className="border-y bg-muted/40">
                            <td
                              colSpan={registry.length + 4}
                              className="px-5 py-3"
                            >
                              <span className="flex items-center gap-2.5">
                                <IconTile
                                  icon={group.icon}
                                  tone={group.tone}
                                  size="sm"
                                />
                                <span className="text-sm font-semibold text-foreground">
                                  {group.title}
                                </span>
                                <span className="rounded-md bg-card px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums ring-1 ring-border">
                                  {group.roles.length}
                                </span>
                                <span className="hidden text-sm text-muted-foreground sm:inline">
                                  {group.hint}
                                </span>
                              </span>
                            </td>
                          </tr>
                          {group.roles.map((role) => (
                            <tr
                              key={role.name}
                              onClick={() => router.push(open(role))}
                              className="cursor-pointer transition-colors hover:bg-muted/40"
                            >
                              <td className="px-5 py-3">
                                <Link
                                  href={open(role)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                                >
                                  <span className="flex items-center gap-1.5 font-medium">
                                    {role.label}
                                    {role.built_in && (
                                      <LockIcon
                                        className="size-3 text-muted-foreground"
                                        aria-label="Built in"
                                      />
                                    )}
                                  </span>
                                </Link>
                              </td>
                              <td className="px-3 py-3">
                                <PeopleStack people={role.people} />
                              </td>
                              {registry.map((area) => (
                                <td key={area.area} className="px-3 py-3">
                                  <LevelMeter
                                    area={area}
                                    levelKey={role.levels[area.area] ?? "none"}
                                  />
                                </td>
                              ))}
                              <td className="px-3 py-3">
                                <span className="flex items-center gap-1.5">
                                  {switches.map((sw) => {
                                    const style = SWITCH_STYLE[sw.key]
                                    return role.flags[sw.key] && style ? (
                                      <span
                                        key={sw.key}
                                        title={sw.title}
                                        className={`flex size-6 items-center justify-center rounded-md ${TONES[style.tone].tile}`}
                                      >
                                        <style.icon className="size-3.5" />
                                        <span className="sr-only">
                                          {sw.title}
                                        </span>
                                      </span>
                                    ) : null
                                  })}
                                  {!switches.some(
                                    (sw) => role.flags[sw.key]
                                  ) && (
                                    <span className="text-muted-foreground/50">
                                      —
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="pr-4">
                                <ChevronRightIcon className="size-4 text-muted-foreground/60" />
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      )
                    )}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full cursor-pointer items-center gap-2 border-t px-5 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
              >
                <PlusIcon className="size-4" />
                Make a role for a job that is not listed, like a senior cashier
              </button>
            </div>
          </section>
        </>
      )}

      <NewRoleDialog open={creating} onOpenChange={setCreating} roles={all} />
    </div>
  )
}
