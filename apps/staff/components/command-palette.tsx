"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  BoxesIcon,
  BuildingIcon,
  CableIcon,
  ClipboardCheckIcon,
  ChartColumnIcon,
  FolderTreeIcon,
  HashIcon,
  RulerIcon,
  WalletIcon,
  MailIcon,
  HistoryIcon,
  PackageCheckIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"

import { TONES, type Tone } from "@/components/ui-kit/icon-tile"
import { useSession } from "@/components/session"
import { type CapabilityName } from "@/lib/api"
import { PRODUCTS_COMMAND_EVENT, type ProductsCommand } from "@/lib/commands"

type Command = {
  id: string
  label: string
  hint: string
  icon: LucideIcon
  /** The module's colour, the same as in the sidebar. */
  tone: Tone
  /** Shown only to people who may use it, like the sidebar (the server checks again). */
  capability?: CapabilityName
  run: ProductsCommand | { href: string }
}

// Only pages that exist, with the sidebar's icon and colour.
// Orders, customers and so on are added here as they are built.
const PAGES: Command[] = [
  {
    id: "products",
    label: "Products & stock",
    hint: "Page",
    icon: BoxesIcon,
    tone: "cobalt",
    capability: "products.view",
    run: { href: "/products" },
  },
  {
    id: "stock-counts",
    label: "Stock counts",
    hint: "Page",
    icon: PackageCheckIcon,
    tone: "rose",
    capability: "stock.count",
    run: { href: "/stock-counts" },
  },
  {
    id: "approvals",
    label: "Approvals (waiting for my decision)",
    hint: "Work",
    icon: ClipboardCheckIcon,
    tone: "emerald",
    capability: "approvals.inbox",
    run: { href: "/approvals" },
  },
  {
    id: "stock-balance",
    label: "Stock balance report",
    hint: "Reports",
    icon: ChartColumnIcon,
    tone: "teal",
    capability: "reports.stock",
    run: { href: "/reports/stock-balance" },
  },
  {
    id: "email",
    label: "Email (account, queue, templates)",
    hint: "Settings",
    icon: MailIcon,
    tone: "rose",
    capability: "email.manage",
    run: { href: "/settings/email" },
  },
  {
    id: "integrations",
    label: "Integrations (PostEx, payments, attendance)",
    hint: "Settings",
    icon: CableIcon,
    tone: "teal",
    capability: "integrations.view",
    run: { href: "/settings/integrations" },
  },
  {
    id: "history",
    label: "Change history (who changed what)",
    hint: "Settings",
    icon: HistoryIcon,
    tone: "cobalt",
    capability: "audit.view",
    run: { href: "/settings/history" },
  },
  {
    id: "catalogue",
    label: "Catalogue (categories and brands)",
    hint: "Settings",
    icon: FolderTreeIcon,
    tone: "violet",
    capability: "catalogue.manage",
    run: { href: "/settings/catalogue" },
  },
  {
    id: "units",
    label: "Units (piece, box, carton)",
    hint: "Settings",
    icon: RulerIcon,
    tone: "violet",
    capability: "units.manage",
    run: { href: "/settings/units" },
  },
  {
    id: "payment-methods",
    label: "Payment methods",
    hint: "Settings",
    icon: WalletIcon,
    tone: "emerald",
    capability: "payments.manage",
    run: { href: "/settings/payment-methods" },
  },
  {
    id: "numbering",
    label: "Numbering of documents",
    hint: "Settings",
    icon: HashIcon,
    tone: "cobalt",
    capability: "numbering.view",
    run: { href: "/settings/numbering" },
  },
  {
    id: "roles",
    label: "Roles & permissions",
    hint: "Settings",
    icon: ShieldCheckIcon,
    tone: "fuchsia",
    capability: "roles.manage",
    run: { href: "/settings/roles" },
  },
  {
    id: "company",
    label: "Company (details, logo, branches)",
    hint: "Settings",
    icon: BuildingIcon,
    tone: "amber",
    capability: "company.manage",
    run: { href: "/settings/company" },
  },
  {
    id: "people",
    label: "People (logins and roles)",
    hint: "Settings",
    icon: UsersRoundIcon,
    tone: "lime",
    capability: "users.manage",
    run: { href: "/settings/people" },
  },
  {
    id: "new-product",
    label: "New product",
    hint: "Action",
    icon: PlusIcon,
    tone: "cobalt",
    capability: "products.create",
    run: { create: true },
  },
]

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [text, setText] = React.useState("")
  const [active, setActive] = React.useState(0)
  const { capabilities } = useSession()

  React.useEffect(() => {
    if (open) {
      setText("")
      setActive(0)
    }
  }, [open])

  const query = text.trim()
  const matches = PAGES.filter(
    (c) =>
      (!c.capability || capabilities[c.capability]) &&
      c.label.toLowerCase().includes(query.toLowerCase())
  )
  const results: Command[] = [
    ...matches,
    ...(query && capabilities["products.view"]
      ? [
          {
            id: "search",
            label: `Search products for “${query}”`,
            hint: "Products",
            icon: SearchIcon,
            tone: "cobalt",
            run: { search: query },
          } satisfies Command,
        ]
      : []),
  ]

  function choose(command: Command) {
    onOpenChange(false)
    const run = command.run
    if ("href" in run) {
      router.push(run.href)
      return
    }
    if (pathname === "/products") {
      window.dispatchEvent(
        new CustomEvent(PRODUCTS_COMMAND_EVENT, { detail: run })
      )
    } else {
      const params = new URLSearchParams()
      if (run.search) params.set("q", run.search)
      if (run.create) params.set("new", "1")
      router.push(`/products?${params}`)
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((i) => Math.min(results.length - 1, i + 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault()
      choose(results[active])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Jump to</DialogTitle>
        <DialogDescription className="sr-only">
          Go to a page or start an action
        </DialogDescription>
        <div className="flex items-center gap-3 border-b px-4">
          <SearchIcon className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setActive(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page or action…"
            aria-label="Jump to a page or action"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul
          className="flex max-h-72 flex-col gap-0.5 overflow-y-auto p-2"
          role="listbox"
        >
          {results.map((command, index) => (
            <li key={command.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseMove={() => setActive(index)}
                onClick={() => choose(command)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm",
                  index === active && "bg-muted"
                )}
              >
                <command.icon
                  className={cn("size-4", TONES[command.tone].text)}
                />
                <span className="flex-1 truncate font-medium">
                  {command.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {command.hint}
                </span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing found.
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
