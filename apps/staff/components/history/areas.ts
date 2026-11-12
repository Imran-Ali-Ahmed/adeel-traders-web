import {
  BoxesIcon,
  BuildingIcon,
  FolderTreeIcon,
  LogInIcon,
  SettingsIcon,
  ShieldCheckIcon,
  TagIcon,
  UsersRoundIcon,
  WarehouseIcon,
  type LucideIcon,
} from "lucide-react"

import type { Tone } from "@/components/ui-kit/icon-tile"

/** Each area of the change history keeps its module's icon and colour (DESIGN.md §0a). */
export const AREA_LOOK: Record<string, { icon: LucideIcon; tone: Tone }> = {
  Products: { icon: BoxesIcon, tone: "cobalt" },
  Prices: { icon: TagIcon, tone: "emerald" },
  Catalogue: { icon: FolderTreeIcon, tone: "violet" },
  Stock: { icon: WarehouseIcon, tone: "teal" },
  People: { icon: UsersRoundIcon, tone: "lime" },
  Roles: { icon: ShieldCheckIcon, tone: "fuchsia" },
  Company: { icon: BuildingIcon, tone: "amber" },
  Settings: { icon: SettingsIcon, tone: "rose" },
  Logins: { icon: LogInIcon, tone: "lime" },
}

/** The area's name in the app: logins are called Security. */
export const areaLabel = (area: string) =>
  area === "Logins" ? "Security" : area

/** Where a record lives in the app, when it has its own page. */
export function recordHref(doctype: string, name: string): string | null {
  const id = encodeURIComponent(name)
  switch (doctype) {
    case "Item":
    case "Product Bundle":
      return `/products/${id}`
    case "User":
      return `/settings/people/${id}`
    case "Role":
      return `/settings/roles/${id}`
    case "Company":
    case "Branch":
    case "Address":
      return "/settings/company"
    case "Item Group":
    case "Brand":
      return "/settings/catalogue"
    case "Stock Count":
      return `/stock-counts/${id}`
    default:
      return null
  }
}
