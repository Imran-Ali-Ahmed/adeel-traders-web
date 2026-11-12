"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { ean13Modules } from "@/lib/ean13"
import { formatRs } from "@/lib/format"

const QUIET = 9 // blank modules each side, required by the standard so scanners can find the start

function barsSvg(modules: string, code: string, height = 70) {
  const width = modules.length + QUIET * 2
  const bars = [...modules]
    .map((m, i) =>
      m === "1"
        ? `<rect x="${i + QUIET}" y="0" width="1" height="${height}"/>`
        : ""
    )
    .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height + 14}" role="img" aria-label="Barcode ${code}">
<rect width="${width}" height="${height + 14}" fill="#fff"/><g fill="#000">${bars}</g>
<text x="${width / 2}" y="${height + 11}" font-family="monospace" font-size="9" text-anchor="middle" fill="#000">${code}</text></svg>`
}

function escapeHtml(text: string) {
  return text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!
  )
}

/** The scannable barcode picture for one product, with a button to print a sticker. */
export function BarcodeLabel({
  code,
  name,
  price,
}: {
  code: string
  name: string
  price: number | null
}) {
  const modules = ean13Modules(code)
  if (!modules) {
    return (
      <p className="text-sm text-muted-foreground">
        {code} is not a standard 13-digit barcode, so a picture can't be drawn
        for it.
      </p>
    )
  }
  const svg = barsSvg(modules, code)

  function print() {
    const win = window.open("", "_blank", "width=420,height=420")
    if (!win) return
    win.document.write(`<!doctype html><title>Label ${escapeHtml(code)}</title>
<style>body{font-family:system-ui,sans-serif;margin:0;display:flex;justify-content:center;padding:16px}
.label{width:58mm;text-align:center}.label svg{width:100%;height:auto}
p{margin:2px 0;font-size:11px}.price{font-weight:700;font-size:14px}</style>
<div class="label"><p>${escapeHtml(name)}</p>${svg}${price !== null ? `<p class="price">${escapeHtml(formatRs(price))}</p>` : ""}</div>
<script>addEventListener("load",()=>{print()})</script>`)
    win.document.close()
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div
        className="w-44 max-w-full rounded-lg border bg-white p-1.5"
        // Our own generated SVG: only digits from a validated code go into it.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <Button variant="outline" onClick={print}>
        <PrinterIcon data-icon="inline-start" />
        Print label
      </Button>
    </div>
  )
}
