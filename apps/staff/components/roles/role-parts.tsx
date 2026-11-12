"use client"

import * as React from "react"
import {
  BoxesIcon,
  CableIcon,
  ChartColumnIcon,
  ClipboardCheckIcon,
  DownloadIcon,
  FolderTreeIcon,
  HashIcon,
  HistoryIcon,
  LockIcon,
  MailIcon,
  PackageCheckIcon,
  RulerIcon,
  TagIcon,
  TriangleAlertIcon,
  WalletIcon,
  WarehouseIcon,
  type LucideIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { isRisky, levelOf, setLevel } from "@/components/roles/grants"
import { IconTile, type Tone } from "@/components/ui-kit/icon-tile"
import { avatarTone, initials } from "@/lib/format"
import type { RoleArea, RoleGrants } from "@/lib/api"

type Level = RoleArea["levels"][number]

/** Icon and colour per area, the same as the sidebar uses for those screens. */
export const AREA_STYLE: Record<string, { icon: LucideIcon; tone: Tone }> = {
  products: { icon: BoxesIcon, tone: "cobalt" },
  prices: { icon: TagIcon, tone: "emerald" },
  catalogue: { icon: FolderTreeIcon, tone: "violet" },
  stock: { icon: WarehouseIcon, tone: "teal" },
  stock_counts: { icon: PackageCheckIcon, tone: "rose" },
  reports: { icon: ChartColumnIcon, tone: "teal" },
  units: { icon: RulerIcon, tone: "violet" },
  payment_methods: { icon: WalletIcon, tone: "emerald" },
  email: { icon: MailIcon, tone: "rose" },
  integrations: { icon: CableIcon, tone: "teal" },
  numbering: { icon: HashIcon, tone: "cobalt" },
}

/** Icon and colour per switch (the words come from the server). */
export const SWITCH_STYLE: Record<string, { icon: LucideIcon; tone: Tone }> = {
  cost: { icon: LockIcon, tone: "violet" },
  export: { icon: DownloadIcon, tone: "cobalt" },
  history: { icon: HistoryIcon, tone: "cobalt" },
  approve: { icon: ClipboardCheckIcon, tone: "emerald" },
}
const DEFAULT_STYLE = { icon: BoxesIcon, tone: "cobalt" as Tone }

const AVATAR_TONES = {
  1: "bg-chart-1/12 text-chart-1",
  2: "bg-chart-2/14 text-chart-2",
  3: "bg-chart-3/18 text-warning-ink",
  4: "bg-chart-4/14 text-chart-4",
  5: "bg-chart-5/14 text-chart-5",
} as const

/** A person's initials in a soft colour that is always the same for that person. */
export function PersonAvatar({
  user,
  name,
  size = "sm",
}: {
  user: string
  name: string
  size?: "sm" | "default" | "lg"
}) {
  return (
    <Avatar size={size} title={name}>
      <AvatarFallback
        className={cn(
          "font-semibold",
          size === "sm"
            ? "text-[0.6rem]"
            : size === "lg"
              ? "text-sm"
              : "text-xs",
          AVATAR_TONES[avatarTone(user)]
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

/** Overlapping avatars of the people who have a role, with the count in words. */
export function PeopleStack({
  people,
  max = 3,
}: {
  people: { user: string; name: string }[]
  max?: number
}) {
  if (people.length === 0) {
    return <span className="text-sm text-muted-foreground">Nobody yet</span>
  }
  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-1.5 *:ring-2 *:ring-card">
        {people.slice(0, max).map((p) => (
          <PersonAvatar key={p.user} user={p.user} name={p.name} />
        ))}
      </span>
      <span className="text-sm text-muted-foreground tabular-nums">
        {people.length} {people.length === 1 ? "person" : "people"}
      </span>
    </span>
  )
}

// Same scale in every area: 1 bar = see, 3 bars = the most this area allows, 2 = in between.
export function filledBars(area: RoleArea, level: Level) {
  const top = area.levels.length - 1
  return level.rank >= top ? 3 : Math.min(level.rank, 2)
}

/** The 3-bar glyph (table cells and inside each picker option). */
export function Bars({
  filled,
  risky,
  inverted,
}: {
  filled: number
  risky?: boolean
  inverted?: boolean
}) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-full",
            ["h-2", "h-2.5", "h-3"][i],
            i < filled
              ? risky
                ? "bg-warning"
                : inverted
                  ? "bg-background"
                  : "bg-foreground/80"
              : inverted
                ? "bg-background/30"
                : "bg-foreground/15"
          )}
        />
      ))}
    </span>
  )
}

/** "Hard to undo": amber means only this, everywhere. */
export function RiskTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-warning/12 px-1.5 py-0.5 text-xs font-medium text-warning-ink">
      <TriangleAlertIcon className="size-3" />
      Hard to undo
    </span>
  )
}

/**
 * How much a role may do in one area, as a small meter plus a word ("▮▮▯ Change"). Calm on
 * purpose: strength is in the bars; amber marks a level that is hard to undo.
 */
export function LevelMeter({
  area,
  levelKey,
}: {
  area: RoleArea
  levelKey: string
}) {
  const level = area.levels.find((l) => l.key === levelKey)
  if (!level || levelKey === "none") {
    return (
      <span className="text-sm text-muted-foreground/50" aria-label="No access">
        —
      </span>
    )
  }
  const risky = isRisky(level)
  return (
    <span
      className="inline-flex items-center gap-2"
      title={level.sentence}
      aria-label={`${level.label}: ${level.sentence}`}
    >
      <Bars filled={filledBars(area, level)} risky={risky} />
      <span className={cn("text-sm", risky && "font-medium text-warning-ink")}>
        {level.label}
      </span>
    </span>
  )
}

/** Choose one level per area. A real radio group: Tab enters it, arrow keys move. */
function LevelPicker({
  area,
  selectedKey,
  onPick,
}: {
  area: RoleArea
  selectedKey: string
  onPick: (level: Level) => void
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.max(
    area.levels.findIndex((l) => l.key === selectedKey),
    0
  )
  const move = (to: number) => {
    const next = (to + area.levels.length) % area.levels.length
    onPick(area.levels[next]!)
    refs.current[next]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={area.short}
      className="inline-flex w-fit flex-wrap gap-0.5 rounded-lg bg-muted p-0.5"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault()
          move(index + 1)
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault()
          move(index - 1)
        }
      }}
    >
      {area.levels.map((level, i) => {
        const selected = level.key === selectedKey
        const risky = isRisky(level)
        return (
          <Tooltip key={level.key}>
            <TooltipTrigger
              render={
                <button
                  ref={(el) => {
                    refs.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-description={level.sentence}
                  tabIndex={i === index ? 0 : -1}
                  onClick={() => onPick(level)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                    selected
                      ? risky
                        ? "bg-warning-ink font-semibold text-background"
                        : "bg-foreground font-semibold text-background"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                />
              }
            >
              {level.key !== "none" && (
                <Bars
                  filled={filledBars(area, level)}
                  inverted={selected}
                  risky={!selected && risky}
                />
              )}
              {level.label}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 py-2 text-sm">
              {level.sentence}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

/**
 * One row per area: icon, name and a plain sentence of what the level means. Editable roles pick
 * a level; built-in roles show the level as a meter (nothing that looks clickable but isn't).
 */
export function AccessList({
  registry,
  grants,
  readOnly,
  onChange,
}: {
  registry: RoleArea[]
  grants: RoleGrants
  readOnly: boolean
  onChange: (next: RoleGrants) => void
}) {
  return (
    <ul className="flex flex-col divide-y">
      {registry.map((area) => {
        const actions = grants[area.area] ?? []
        const key = levelOf(area, actions)
        const current = area.levels.find((l) => l.key === key)
        const risky = current ? isRisky(current) : false
        const style = AREA_STYLE[area.area] ?? DEFAULT_STYLE
        return (
          <li
            key={area.area}
            className="grid gap-3 px-5 py-4 transition-colors hover:bg-muted/30 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8"
          >
            <div className="flex min-w-0 items-start gap-3">
              <IconTile
                icon={style.icon}
                tone={style.tone}
                className="mt-0.5"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {area.short}
                  {risky && <RiskTag />}
                </span>
                <span className="text-sm text-muted-foreground">
                  {current?.sentence ??
                    `Custom: ${actions
                      .map(
                        (a) => area.actions.find((x) => x.key === a)?.label ?? a
                      )
                      .join(", ")
                      .toLowerCase()}.`}
                </span>
              </div>
            </div>
            {readOnly ? (
              <span className="md:justify-self-end">
                <LevelMeter area={area} levelKey={key} />
              </span>
            ) : (
              <LevelPicker
                area={area}
                selectedKey={key}
                onPick={(level) =>
                  onChange(setLevel(grants, registry, area.area, level))
                }
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
