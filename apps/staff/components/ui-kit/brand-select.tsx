"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const NONE = "__none__"

/** Brand picker with a "No brand" choice. Brands are managed in Settings › Catalogue. */
export function BrandSelect({
  id,
  value,
  onChange,
  brands,
}: {
  id: string
  value: string | null
  onChange: (brand: string | null) => void
  brands: string[]
}) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(!v || v === NONE ? null : String(v))}
      items={{
        [NONE]: "No brand",
        ...Object.fromEntries(brands.map((b) => [b, b])),
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={NONE}>No brand</SelectItem>
          {brands.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
