"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "next-themes"
import {
  BoxesIcon,
  BuildingIcon,
  CableIcon,
  ChartColumnIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  FolderTreeIcon,
  HashIcon,
  RulerIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  MoonIcon,
  PackageCheckIcon,
  SearchIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SunIcon,
  TruckIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"

import { CommandPalette } from "@/components/command-palette"
import { NotificationBell } from "@/components/notification-bell"
import { TONES, type Tone } from "@/components/ui-kit/icon-tile"
import { useSession } from "@/components/session"
import { api, type CapabilityName } from "@/lib/api"
import { logout } from "@/lib/frappe"

type NavItem = {
  label: string
  icon: LucideIcon
  href?: string
  /** Shown only to roles that have this capability (the server checks again). */
  capability?: CapabilityName
  /** The module's colour, used for its icon everywhere. */
  tone?: Tone
  /** Shows the number of waiting items next to the label. */
  badge?: "approvals"
}
type NavGroup = {
  label: string
  items: NavItem[]
  /** A long group that folds to its heading; open while one of its pages is open. */
  foldable?: boolean
}

// Built modules first. Modules from the SRS that are not built yet are listed quietly
// under "Coming next" so staff see the roadmap without dead links.
const NAV: NavGroup[] = [
  {
    label: "Work",
    items: [
      {
        label: "Approvals",
        icon: ClipboardCheckIcon,
        tone: "emerald",
        href: "/approvals",
        badge: "approvals",
        capability: "approvals.inbox",
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        label: "Products & stock",
        icon: BoxesIcon,
        tone: "cobalt",
        href: "/products",
        capability: "products.view",
      },
      {
        label: "Stock counts",
        icon: PackageCheckIcon,
        tone: "rose",
        href: "/stock-counts",
        capability: "stock.count",
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Stock balance",
        icon: ChartColumnIcon,
        tone: "teal",
        href: "/reports/stock-balance",
        capability: "reports.stock",
      },
    ],
  },
  {
    label: "Settings",
    foldable: true,
    items: [
      {
        label: "Catalogue",
        icon: FolderTreeIcon,
        href: "/settings/catalogue",
        tone: "violet",
        capability: "catalogue.manage",
      },
      {
        label: "Units",
        icon: RulerIcon,
        href: "/settings/units",
        tone: "violet",
        capability: "units.manage",
      },
      {
        label: "Payment methods",
        icon: WalletIcon,
        href: "/settings/payment-methods",
        tone: "emerald",
        capability: "payments.manage",
      },
      {
        label: "Numbering",
        icon: HashIcon,
        href: "/settings/numbering",
        tone: "cobalt",
        capability: "numbering.view",
      },
      {
        label: "Roles & permissions",
        icon: ShieldCheckIcon,
        tone: "fuchsia",
        href: "/settings/roles",
        capability: "roles.manage",
      },
      {
        label: "Company",
        icon: BuildingIcon,
        tone: "amber",
        href: "/settings/company",
        capability: "company.manage",
      },
      {
        label: "People",
        icon: UsersRoundIcon,
        tone: "lime",
        href: "/settings/people",
        capability: "users.manage",
      },
      {
        label: "Email",
        icon: MailIcon,
        tone: "rose",
        href: "/settings/email",
        capability: "email.manage",
      },
      {
        label: "Integrations",
        icon: CableIcon,
        tone: "teal",
        href: "/settings/integrations",
        capability: "integrations.view",
      },
      {
        label: "Change history",
        icon: HistoryIcon,
        tone: "cobalt",
        href: "/settings/history",
        capability: "audit.view",
      },
    ],
  },
]

const COMING_NEXT: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboardIcon },
  { label: "Point of sale", icon: MonitorSmartphoneIcon },
  { label: "Online orders", icon: ShoppingBagIcon },
  { label: "Customers", icon: UsersIcon },
  { label: "Purchase orders", icon: FileTextIcon },
  { label: "Suppliers", icon: TruckIcon },
  { label: "Accounts", icon: WalletIcon },
  { label: "Users & settings", icon: SettingsIcon },
]

type Crumb = { label: string; href?: string }

/** Breadcrumb for the current page; the last item is the page itself. */
function crumbsFor(pathname: string, productName?: string): Crumb[] {
  if (pathname === "/products") {
    return [{ label: "Inventory" }, { label: "Products & stock" }]
  }
  if (pathname.startsWith("/products/")) {
    return [
      { label: "Inventory" },
      { label: "Products & stock", href: "/products" },
      {
        label:
          productName ??
          decodeURIComponent(pathname.slice("/products/".length)),
      },
    ]
  }
  if (pathname === "/stock-counts") {
    return [{ label: "Inventory" }, { label: "Stock counts" }]
  }
  if (pathname.startsWith("/stock-counts/")) {
    return [
      { label: "Inventory" },
      { label: "Stock counts", href: "/stock-counts" },
      { label: decodeURIComponent(pathname.slice("/stock-counts/".length)) },
    ]
  }
  if (pathname === "/settings/catalogue") {
    return [{ label: "Settings" }, { label: "Catalogue" }]
  }
  if (pathname === "/settings/company") {
    return [{ label: "Settings" }, { label: "Company" }]
  }
  if (pathname === "/settings/people") {
    return [{ label: "Settings" }, { label: "People" }]
  }
  if (pathname.startsWith("/settings/people/")) {
    return [
      { label: "Settings" },
      { label: "People", href: "/settings/people" },
      {
        label:
          productName ??
          decodeURIComponent(pathname.slice("/settings/people/".length)),
      },
    ]
  }
  if (pathname === "/settings/email/template") {
    return [
      { label: "Settings" },
      { label: "Email", href: "/settings/email" },
      { label: "Template" },
    ]
  }
  if (pathname === "/settings/roles") {
    return [{ label: "Settings" }, { label: "Roles & permissions" }]
  }
  if (pathname.startsWith("/settings/roles/")) {
    return [
      { label: "Settings" },
      { label: "Roles & permissions", href: "/settings/roles" },
      {
        label: decodeURIComponent(
          pathname.slice("/settings/roles/".length)
        ).replace(/^AT /, ""),
      },
    ]
  }
  // Any other page that is in the sidebar: "Group > Page".
  for (const group of NAV) {
    const item = group.items.find((i) => i.href === pathname)
    if (item) return [{ label: group.label }, { label: item.label }]
  }
  return []
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const session = useSession()
  // Waiting approvals for the sidebar badge; checked again every minute.
  const approvals = useQuery({
    queryKey: ["approvals"],
    queryFn: api.approvals,
    refetchInterval: 60_000,
    enabled: session.capabilities["approvals.inbox"] === true,
  })
  const approvalCount = approvals.data?.count ?? 0
  const visibleNav = NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.capability || session.capabilities[item.capability]
    ),
  })).filter((group) => group.items.length > 0)
  const name = session.full_name || session.user
  const productCode = pathname.startsWith("/products/")
    ? decodeURIComponent(pathname.slice("/products/".length))
    : null
  // The product page loads this query; reading it here only picks up its name.
  const loaded = useQuery({
    queryKey: ["product", productCode],
    queryFn: () => api.getProduct(productCode!),
    enabled: false,
  })
  const personUser = pathname.startsWith("/settings/people/")
    ? decodeURIComponent(pathname.slice("/settings/people/".length))
    : null
  // Same for the person page: show the person's name, not their email.
  const person = useQuery({
    queryKey: ["person", personUser],
    queryFn: () => api.person(personUser!),
    enabled: false,
  })
  const crumbs = crumbsFor(
    pathname,
    loaded.data?.item_name ?? person.data?.name
  )

  const [paletteOpen, setPaletteOpen] = React.useState(false)
  // Foldable groups (Settings): shut unless one of their pages is open, or the person opened them.
  const [opened, setOpened] = React.useState<Record<string, boolean>>({})
  const openSearch = React.useCallback(() => setPaletteOpen(true), [])

  // The menu scrolls without a scrollbar, so on a short window the open page can sit out of
  // sight. Bring it into view on every page change, and fade the edge that has more beyond it.
  const navRef = React.useRef<HTMLDivElement>(null)
  const [more, setMore] = React.useState({ above: false, below: false })
  const checkMore = React.useCallback(() => {
    const el = navRef.current
    if (!el) return
    const above = el.scrollTop > 4
    const below = el.scrollHeight - el.scrollTop - el.clientHeight > 4
    setMore((m) =>
      m.above === above && m.below === below ? m : { above, below }
    )
  }, [])
  React.useEffect(() => {
    const el = navRef.current
    if (!el) return
    el.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" })
    checkMore()
    const watch = new ResizeObserver(checkMore)
    watch.observe(el)
    return () => watch.disconnect()
  }, [pathname, checkMore])

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // event.key can be undefined (e.g. browser autofill events), so guard it.
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key?.toLowerCase() === "k"
      ) {
        event.preventDefault()
        openSearch()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openSearch])

  async function onSignOut() {
    await logout()
    window.location.assign("/login")
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}
    >
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-5 pt-6 pb-4 group-data-[collapsible=icon]:px-2">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="flex size-9 items-center justify-center rounded-lg bg-foreground font-heading text-sm font-bold text-background">
              AT
            </div>
            <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate font-heading text-[0.95rem] font-semibold text-foreground">
                Adeel Traders
              </span>
              <span className="truncate text-xs">Business portal</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent
          ref={navRef}
          onScroll={checkMore}
          className={cn(
            "px-3 group-data-[collapsible=icon]:px-2",
            more.below &&
              !more.above &&
              "mask-[linear-gradient(to_bottom,black_calc(100%-2rem),transparent)]",
            more.above &&
              !more.below &&
              "mask-[linear-gradient(to_bottom,transparent,black_2rem)]",
            more.above &&
              more.below &&
              "mask-[linear-gradient(to_bottom,transparent,black_2rem,black_calc(100%-2rem),transparent)]"
          )}
        >
          {visibleNav.map((group) => {
            const active = group.items.some(
              (i) => i.href && pathname.startsWith(i.href)
            )
            const open = !group.foldable || (opened[group.label] ?? active)
            return (
              <SidebarGroup key={group.label}>
                {group.foldable ? (
                  <SidebarGroupLabel
                    render={<button type="button" />}
                    aria-expanded={open}
                    onClick={() =>
                      setOpened({ ...opened, [group.label]: !open })
                    }
                    className="cursor-pointer justify-between text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  >
                    {group.label}
                    <ChevronDownIcon
                      className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </SidebarGroupLabel>
                ) : (
                  <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/70">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent
                  className={
                    open
                      ? undefined
                      : "hidden group-data-[collapsible=icon]:block"
                  }
                >
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          tooltip={item.label}
                          isActive={
                            item.href ? pathname.startsWith(item.href) : false
                          }
                          render={<Link href={item.href ?? "#"} />}
                          className="h-9 rounded-lg font-medium text-sidebar-foreground group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-card data-active:text-foreground data-active:ring-1 data-active:ring-sidebar-border group-data-[collapsible=icon]:[&>span]:hidden"
                        >
                          <item.icon
                            className={
                              item.tone ? TONES[item.tone].text : undefined
                            }
                          />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                        {item.badge === "approvals" && approvalCount > 0 && (
                          <SidebarMenuBadge className="rounded-full bg-warning/15 text-warning-ink tabular-nums">
                            {approvalCount}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
          <SidebarGroup>
            <details className="group/soon group-data-[collapsible=icon]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70 select-none hover:text-sidebar-foreground [&::-webkit-details-marker]:hidden">
                Coming soon ({COMING_NEXT.length})
                <ChevronDownIcon className="size-3.5 transition-transform group-open/soon:rotate-180" />
              </summary>
              <ul className="mt-1 flex flex-col gap-0.5 px-2">
                {COMING_NEXT.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground/55"
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </li>
                ))}
              </ul>
            </details>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1.5 hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50" />
              }
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-chart-2/15 text-xs font-semibold text-chart-2">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold text-foreground">
                  {name}
                </span>
                <span className="truncate text-xs">
                  {session.role_label || session.company}
                </span>
              </span>
              <ChevronsUpDownIcon className="size-4 group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{session.user}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background px-4 md:px-8">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <Breadcrumb className="max-sm:hidden">
            <BreadcrumbList>
              {crumbs.map((crumb, index) => (
                <React.Fragment key={crumb.label}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {index === crumbs.length - 1 ? (
                      <BreadcrumbPage className="font-semibold">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : crumb.href ? (
                      <BreadcrumbLink render={<Link href={crumb.href} />}>
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      crumb.label
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              className="flex h-10 w-72 items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none max-md:hidden"
            >
              <SearchIcon className="size-4" />
              Search or jump to…
              <kbd className="ml-auto rounded-md border bg-muted px-1.5 py-0.5 text-[0.7rem] font-medium">
                ⌘K
              </kbd>
            </button>
            {/* Phones have no ⌘K key, so search gets its own button there. */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search or jump to"
              onClick={openSearch}
              className="md:hidden"
            >
              <SearchIcon />
            </Button>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        {children}
      </SidebarInset>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </SidebarProvider>
  )
}
