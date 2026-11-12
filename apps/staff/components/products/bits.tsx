import { cn } from "@workspace/ui/lib/utils"

/* ------------------------------------------------------------------ thumbnails */

// Stable gradient per category so rows without photos still scan visually.
const THUMB_TONES = [
  "from-chart-1/20 to-chart-1/5 text-chart-1",
  "from-chart-2/20 to-chart-2/5 text-chart-2",
  "from-chart-3/25 to-chart-3/5 text-chart-3",
  "from-chart-4/20 to-chart-4/5 text-chart-4",
  "from-chart-5/20 to-chart-5/5 text-chart-5",
]

function toneFor(key: string) {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return THUMB_TONES[hash % THUMB_TONES.length]
}

export function ProductThumb({
  name,
  group,
  image,
  size = "md",
}: {
  name: string
  group: string
  image: string | null
  size?: "md" | "lg"
}) {
  const box =
    size === "lg" ? "size-16 rounded-xl text-xl" : "size-10 rounded-lg text-sm"
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- served by Frappe via the same-origin proxy
    return (
      <img
        src={image}
        alt=""
        className={cn(box, "shrink-0 object-cover ring-1 ring-border")}
      />
    )
  }
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
  return (
    <span
      aria-hidden
      className={cn(
        box,
        "flex shrink-0 items-center justify-center bg-gradient-to-br font-heading font-bold",
        toneFor(group)
      )}
    >
      {letters}
    </span>
  )
}

/* ------------------------------------------------------------------ cards */

/** Signature card: ink-to-cobalt gradient with soft light, used once per screen. */
export function HeroCard({
  label,
  value,
  caption,
  children,
}: {
  label: string
  value: string
  caption?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-ink via-ink-2 to-primary p-6 text-white shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-10 size-64 rounded-full bg-chart-2/30 blur-3xl"
      />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-white/70">{label}</span>
          <span className="font-heading text-4xl font-semibold tracking-tight md:text-[2.75rem]">
            {value}
          </span>
          {caption && <span className="text-sm text-white/70">{caption}</span>}
        </div>
        {children}
      </div>
    </div>
  )
}

/** Stock split as one segmented bar, for use on the hero card (white text). */
export function HealthBar({
  inStock,
  low,
  out,
}: {
  inStock: number
  low: number
  out: number
}) {
  const total = inStock + low + out
  const parts = [
    { label: "In stock", value: inStock, className: "bg-emerald-300" },
    { label: "Low", value: low, className: "bg-amber-300" },
    { label: "Out", value: out, className: "bg-rose-400" },
  ]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-white/15">
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <div
                key={p.label}
                className={cn("h-full rounded-full", p.className)}
                style={{ width: `${(p.value / total) * 100}%` }}
              />
            ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/80">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-2">
            <span
              className={cn("size-2 rounded-full", p.className)}
              aria-hidden
            />
            {p.label}
            <span className="font-semibold text-white">{p.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Small bar under a stock number: how much is left compared with the reorder level. */
export function StockMeter({
  qty,
  reorderLevel,
}: {
  qty: number
  reorderLevel: number | null
}) {
  if (!reorderLevel) return null
  const ratio = Math.min(1, qty / (reorderLevel * 2)) // full bar = twice the reorder level
  const tone =
    qty <= 0
      ? "bg-destructive"
      : qty <= reorderLevel
        ? "bg-warning"
        : "bg-success"
  return (
    <div
      className="mt-1.5 h-1 w-20 overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={`${qty} in stock, reorder level ${reorderLevel}`}
    >
      <div
        className={cn("h-full rounded-full", tone)}
        style={{ width: `${Math.max(ratio, 0.04) * 100}%` }}
      />
    </div>
  )
}
