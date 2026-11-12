"use client"

import Link from "next/link"
import { LockIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import type { Session } from "@/lib/api"

// Pages a person can be sent to instead, in the order we try them.
const FALLBACKS = [
  { href: "/products", label: "Products & stock", capability: "products.view" },
  { href: "/stock-counts", label: "Stock counts", capability: "stock.count" },
] as const

/** Shown when the server would refuse the page: says why and where to go next. */
export function NoAccess({
  capabilities,
}: {
  capabilities: Session["capabilities"]
}) {
  const fallback = FALLBACKS.find((f) => capabilities[f.capability])
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <LockIcon className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold">
          You don&apos;t have access to this page
        </h1>
        <p className="text-muted-foreground">
          Your role does not include it. If you need it, ask the owner to give
          your role this permission.
        </p>
      </div>
      {fallback && (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={fallback.href} />}
        >
          Go to {fallback.label}
        </Button>
      )}
    </div>
  )
}
