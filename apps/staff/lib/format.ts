const money = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 })
const qtyFormat = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 3 })

/** "Rs 1,250" — PKR as staff write it. */
export function formatRs(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return `${value < 0 ? "−" : ""}Rs ${money.format(Math.abs(value))}`
}

export function formatQty(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : qtyFormat.format(value)
}

/** "Main Warehouse - AT" → "Main Warehouse" (company suffix is noise for staff). */
export function shortWarehouse(name: string) {
  return name.replace(/ - [A-Z0-9]+$/, "")
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function daysUntil(value: string | null | undefined) {
  if (!value) return null
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000)
}

/** "Imran Ali" -> "IA". */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/** A stable colour slot (1-5) for a person, so the same person always gets the same avatar tint. */
export function avatarTone(key: string): 1 | 2 | 3 | 4 | 5 {
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return ((hash % 5) + 1) as 1 | 2 | 3 | 4 | 5
}

/** "just now", "5 minutes ago", "yesterday", "3 days ago", or a date for older times. */
export function timeAgo(value: string | null | undefined) {
  if (!value) return "Never"
  const seconds =
    (Date.now() - new Date(value.replace(" ", "T")).getTime()) / 1000
  if (seconds < 60) return "Just now"
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), "minute")
  if (seconds < 86_400) return rtf.format(-Math.round(seconds / 3600), "hour")
  if (seconds < 7 * 86_400)
    return rtf.format(-Math.round(seconds / 86_400), "day")
  return formatDate(value)
}
