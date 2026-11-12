import type { RoleArea, RoleFlags, RoleGrants } from "@/lib/api"

/** What the owner has chosen on the role page, before saving. */
export type Draft = {
  grants: RoleGrants
  flags: RoleFlags
  description: string
}

function sorted(grants: RoleGrants) {
  return Object.keys(grants)
    .sort()
    .map((k) => [k, [...(grants[k] ?? [])].sort()])
}

export function sameDraft(a: Draft, b: Draft) {
  return (
    JSON.stringify(sorted(a.grants)) === JSON.stringify(sorted(b.grants)) &&
    Object.keys({ ...a.flags, ...b.flags }).every(
      (k) => Boolean(a.flags[k]) === Boolean(b.flags[k])
    ) &&
    a.description.trim() === b.description.trim()
  )
}

type Level = RoleArea["levels"][number]

/** The level that matches the ticked actions exactly, or "custom" (the server stores actions). */
export function levelOf(area: RoleArea, actions: string[] = []): string {
  if (actions.length === 0) return "none"
  const same = (l: Level) =>
    l.actions.length === actions.length &&
    l.actions.every((a) => actions.includes(a))
  return area.levels.find(same)?.key ?? "custom"
}

/** Hard to undo, or shows private numbers: the screen marks these with a warning. */
export function isRisky(level: Level) {
  return level.actions.includes("delete") || level.actions.includes("post")
}

/**
 * Choose a level for one area and keep the role in a state the server accepts. The server checks
 * the same rules again (permission_areas.py); this only saves the owner from errors:
 * - choosing a level also gives what the area needs (stock counts need stock and products "See");
 * - choosing "No access" also removes every area that needs this one.
 */
export function setLevel(
  grants: RoleGrants,
  registry: RoleArea[],
  areaKey: string,
  level: Level
): RoleGrants {
  const next: RoleGrants = Object.fromEntries(
    Object.entries(grants).map(([k, v]) => [k, [...v]])
  )
  const clearWithDependents = (key: string) => {
    delete next[key]
    for (const other of registry) {
      if (other.requires.some((r) => r.area === key && r.action === "view")) {
        clearWithDependents(other.area)
      }
    }
  }
  const ensureNeeds = (key: string) => {
    for (const need of registry.find((r) => r.area === key)?.requires ?? []) {
      if (next[need.area]?.includes(need.action)) continue
      const lowest = registry
        .find((r) => r.area === need.area)
        ?.levels.find((l) => l.actions.includes(need.action))
      next[need.area] = [...(lowest?.actions ?? [need.action])]
      ensureNeeds(need.area)
    }
  }

  if (level.actions.length === 0) {
    clearWithDependents(areaKey)
  } else {
    next[areaKey] = [...level.actions]
    ensureNeeds(areaKey)
  }
  return next
}
