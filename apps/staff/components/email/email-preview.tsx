"use client"

import * as React from "react"
import { MonitorIcon, SmartphoneIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { fillSamples } from "@/lib/email-template"

const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** The email as the customer will see it: mail header, logo, text, footer. Sample details only. */
function shell(
  logo: string | null,
  company: string,
  subject: string,
  body: string
) {
  const content = body.trim()
    ? body
    : '<p style="color:#9ca3af">Your message appears here as you write it.</p>'
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;background:#f4f5f7;font:15px/1.65 system-ui,-apple-system,Segoe UI,sans-serif;color:#1f2937}
.card{max-width:600px;margin:0 auto;background:#fff}
.head{padding:18px 24px;border-bottom:1px solid #eef0f3}
.body{padding:24px}
.body p{margin:0 0 14px}.body h2{font-size:19px;margin:18px 0 8px}.body ul,.body ol{margin:0 0 14px 22px}
.body a{color:#2d4cf5}.body table{border-collapse:collapse;max-width:100%}.body td{padding:4px 8px}
.foot{padding:16px 24px;border-top:1px solid #eef0f3;color:#6b7280;font-size:12px}
.meta{padding:12px 24px;background:#fafafa;border-bottom:1px solid #eef0f3;font-size:12px;color:#6b7280}
.meta b{color:#374151}
</style></head><body><div class="card">
<div class="meta"><div><b>From:</b> ${escapeHtml(company)}</div><div><b>Subject:</b> ${subject ? escapeHtml(subject) : '<span style="color:#9ca3af">(no subject yet)</span>'}</div></div>
<div class="head">${
    logo
      ? `<img src="${logo}" alt="" style="max-height:44px">`
      : `<strong style="font-size:17px">${escapeHtml(company)}</strong>`
  }</div>
<div class="body">${content}</div>
<div class="foot">${escapeHtml(company)}</div></div></body></html>`
}

/**
 * Live preview of an email template with sample details, on a computer screen or a phone.
 * `subject` and `body` are the stored texts ({{ words }}); they are filled with samples here.
 */
export function EmailPreview({
  subject,
  body,
  logo,
  company,
  types,
}: {
  subject: string
  body: string
  logo: string | null
  company: string
  /** Field types by name, so a sample looks right (an amount like Rs 5,000, a date). */
  types: Record<string, string>
}) {
  const [device, setDevice] = React.useState<"desktop" | "phone">("desktop")
  const doc = shell(
    logo,
    company,
    fillSamples(subject, types),
    fillSamples(body, types, true)
  )
  const options = [
    { key: "desktop", label: "Computer", icon: MonitorIcon },
    { key: "phone", label: "Phone", icon: SmartphoneIcon },
  ] as const
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">How it looks</span>
        <div
          role="radiogroup"
          aria-label="Preview size"
          className="flex rounded-lg bg-muted p-0.5"
        >
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={device === o.key}
              onClick={() => setDevice(o.key)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                device === o.key &&
                  "bg-card font-medium text-foreground shadow-xs"
              )}
            >
              <o.icon className="size-3.5" />
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-muted/50 p-3">
        <iframe
          title="Email preview"
          sandbox=""
          srcDoc={doc}
          className={cn(
            "mx-auto h-[28rem] w-full rounded-lg border bg-white transition-[max-width]",
            device === "phone" ? "max-w-88" : "max-w-full"
          )}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Sample details, not a real customer. The real details are filled in when
        the email is sent.
      </p>
    </div>
  )
}
