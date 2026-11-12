import type { DocFieldInfo } from "@/lib/api"

/**
 * Email templates for people who do not write code. The owner sees names ("Customer name") as
 * blue chips; Frappe stores {{ customer_name }}. These helpers convert between the two, build the
 * list of things a template may mention (from Frappe's own field list of the document), and make
 * sample values for the preview. Nothing here is business logic: Frappe fills in the real values
 * when the email is sent.
 */

/** What an email can be about. Frappe's Email Template keeps this in "reference_doctype". */
export const DOCUMENT_TYPES = [
  { doctype: "Sales Order", label: "A customer's order" },
  { doctype: "Sales Invoice", label: "An invoice" },
  { doctype: "Quotation", label: "A quotation" },
  { doctype: "Delivery Note", label: "A dispatch (delivery note)" },
  { doctype: "Payment Entry", label: "A payment" },
  { doctype: "Purchase Order", label: "A purchase order to a supplier" },
  { doctype: "Customer", label: "A customer (reminders, statements)" },
] as const

export const documentLabel = (doctype: string | null | undefined) =>
  DOCUMENT_TYPES.find((d) => d.doctype === doctype)?.label ?? doctype ?? ""

/** The facts people ask for most, first and in plain words. */
const FRIENDLY: Record<string, string> = {
  name: "Document number",
  customer_name: "Customer name",
  party_name: "Customer name",
  customer: "Customer",
  company: "Business name",
  grand_total: "Total amount",
  rounded_total: "Total amount (rounded)",
  total: "Total before tax",
  outstanding_amount: "Amount still due",
  paid_amount: "Amount paid",
  transaction_date: "Order date",
  posting_date: "Date",
  delivery_date: "Delivery date",
  due_date: "Due date",
  schedule_date: "Required by",
  contact_display: "Contact person",
  contact_mobile: "Customer phone",
  contact_email: "Customer email",
  address_display: "Customer address",
  shipping_address: "Delivery address",
  status: "Status",
  lr_no: "Tracking number",
}
const MOST_USED = Object.keys(FRIENDLY)

const SKIP_TYPES = new Set([
  "Section Break",
  "Column Break",
  "Tab Break",
  "Table",
  "Table MultiSelect",
  "HTML",
  "Button",
  "Image",
  "Attach",
  "Attach Image",
  "Code",
  "Text Editor",
  "HTML Editor",
  "Markdown Editor",
  "Signature",
  "Geolocation",
  "Heading",
  "Fold",
  "Barcode",
  "Check",
  "Password",
])
const SKIP_FIELDS = new Set([
  "naming_series",
  "amended_from",
  "docstatus",
  "idx",
  "owner",
  "creation",
  "modified",
  "modified_by",
])

export type Insertable = { key: string; label: string; common: boolean }

export const humanize = (key: string) =>
  FRIENDLY[key] ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())

/** What a template about this document may mention, from Frappe's own field list. */
export function insertables(fields: DocFieldInfo[]): Insertable[] {
  const out = new Map<string, Insertable>()
  out.set("name", { key: "name", label: FRIENDLY.name!, common: true })
  for (const f of fields) {
    if (
      f.hidden ||
      SKIP_TYPES.has(f.fieldtype) ||
      SKIP_FIELDS.has(f.fieldname) ||
      out.has(f.fieldname)
    )
      continue
    out.set(f.fieldname, {
      key: f.fieldname,
      label: FRIENDLY[f.fieldname] ?? f.label ?? humanize(f.fieldname),
      common: MOST_USED.includes(f.fieldname),
    })
  }
  const all = [...out.values()]
  const common = all
    .filter((i) => i.common)
    .sort((a, b) => MOST_USED.indexOf(a.key) - MOST_USED.indexOf(b.key))
  const rest = all
    .filter((i) => !i.common)
    .sort((a, b) => a.label.localeCompare(b.label))
  return [...common, ...rest]
}

const escapeHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const VAR = /\{\{\s*(?:doc\.)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

/** Frappe's {{ words }} become blue chips for the editor (every word, so no braces are shown). */
export function toEditorHtml(
  stored: string,
  labelOf: (key: string) => string
): string {
  return stored.replace(
    VAR,
    (_m, key: string) =>
      `<span data-var="${key}">${escapeHtml(labelOf(key))}</span>`
  )
}

/** Chips in the editor's HTML become Frappe's {{ words }} again. */
export function toStoredHtml(html: string): string {
  return html.replace(
    /<span[^>]*data-var="([^"]+)"[^>]*>.*?<\/span>/g,
    (_m, key: string) => `{{ ${key} }}`
  )
}

/** Sample values for the preview. Real values are filled in by Frappe when the email is sent. */
const SAMPLES: Record<string, string> = {
  name: "SO-0042",
  customer_name: "Ali Cosmetics",
  party_name: "Ali Cosmetics",
  customer: "Ali Cosmetics",
  company: "Adeel Traders",
  grand_total: "Rs 12,500",
  rounded_total: "Rs 12,500",
  total: "Rs 11,800",
  outstanding_amount: "Rs 8,200",
  paid_amount: "Rs 4,300",
  transaction_date: "12 Nov 2026",
  posting_date: "12 Nov 2026",
  delivery_date: "15 Nov 2026",
  due_date: "30 Nov 2026",
  schedule_date: "20 Nov 2026",
  contact_display: "Ali Raza",
  contact_mobile: "0300 1234567",
  contact_email: "ali@example.com",
  address_display: "Shop 12, Main Bazar, Gujranwala",
  shipping_address: "Shop 12, Main Bazar, Gujranwala",
  status: "Confirmed",
  lr_no: "PX-123456",
}

export function sampleValue(key: string, fieldtype?: string): string {
  if (SAMPLES[key]) return SAMPLES[key]
  switch (fieldtype) {
    case "Currency":
      return "Rs 5,000"
    case "Float":
    case "Int":
    case "Percent":
      return "10"
    case "Date":
    case "Datetime":
      return "12 Nov 2026"
    case "Phone":
      return "0300 1234567"
    default:
      return humanize(key)
  }
}

/** The stored text with sample values in place of every {{ word }}, for the preview. */
export function fillSamples(
  stored: string,
  types: Record<string, string> = {},
  escapeValues = false
): string {
  return stored.replace(VAR, (_m, key: string) => {
    const v = sampleValue(key, types[key])
    return escapeValues ? escapeHtml(v) : v
  })
}

/** One plain line for the list: the text without tags, words in place of {{ words }}. */
export function plainLine(stored: string | null | undefined, max = 110) {
  const text = (stored ?? "")
    .replace(VAR, (_m, key: string) => `(${humanize(key).toLowerCase()})`)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** Ready-made examples, so nobody starts from a blank page. */
export const STARTERS: Record<
  string,
  { title: string; doctype: string; subject: string; body: string }
> = {
  order_confirmed: {
    title: "Order confirmed",
    doctype: "Sales Order",
    subject: "We received your order {{ name }}",
    body: "<p>Dear {{ customer_name }},</p><p>Thank you for your order <strong>{{ name }}</strong> of {{ grand_total }}. We will pack it and let you know when it is on its way.</p><p>Warm regards,<br>{{ company }}</p>",
  },
  order_dispatched: {
    title: "Order on its way",
    doctype: "Sales Order",
    subject: "Your order {{ name }} is on its way",
    body: "<p>Dear {{ customer_name }},</p><p>Your order <strong>{{ name }}</strong> has been dispatched and should reach you by {{ delivery_date }}.</p><p>Thank you for shopping with {{ company }}.</p>",
  },
  payment_reminder: {
    title: "Payment reminder",
    doctype: "Sales Invoice",
    subject: "Reminder: invoice {{ name }} is due",
    body: "<p>Dear {{ customer_name }},</p><p>This is a friendly reminder that invoice <strong>{{ name }}</strong> has <strong>{{ outstanding_amount }}</strong> still due since {{ due_date }}.</p><p>Please send the payment at your earliest convenience. Thank you.</p><p>{{ company }}</p>",
  },
}
