"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BellIcon, CheckCheckIcon } from "lucide-react"

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
import { cn } from "@workspace/ui/lib/utils"

import { recordHref } from "@/components/history/areas"
import { PersonAvatar } from "@/components/roles/role-parts"
import { api, type AppNotification } from "@/lib/api"
import { timeAgo } from "@/lib/format"

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim()

/**
 * The bell (P1.7): Frappe's notification log for the signed-in person. Unread count checked every
 * minute; opening an item marks it read and goes to its page in the staff app.
 */
export function NotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: api.unreadNotifications,
    refetchInterval: 60_000,
  })
  const list = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: api.notifications,
    enabled: false, // loaded when the bell is opened
  })
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications"] })
  const markAll = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: refresh,
  })
  const count = unread.data ?? 0
  const items = list.data?.notification_logs ?? []

  const open = (n: AppNotification) => {
    if (!n.read) api.markNotificationRead(n.name).then(refresh)
    const href =
      // our pages only; Desk links (/app/...) are not for staff
      n.link?.startsWith("/") && !/^\/(app|desk)(\/|$)/.test(n.link)
        ? n.link
        : n.document_type && n.document_name
          ? recordHref(n.document_type, n.document_name)
          : null
    if (href) router.push(href)
  }

  return (
    <DropdownMenu
      onOpenChange={(isOpen) => {
        if (isOpen) list.refetch()
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              count ? `Notifications, ${count} unread` : "Notifications"
            }
            className="relative"
          />
        }
      >
        <BellIcon />
        {count > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] leading-4 font-semibold text-white tabular-nums">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))]"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">
              Notifications
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="inline-flex cursor-pointer items-center gap-1 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <CheckCheckIcon className="size-3.5" />
                Mark all read
              </button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-96 overflow-y-auto">
          {list.isFetching && items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.name}
                onClick={() => open(n)}
                className="flex items-start gap-2.5 py-2.5"
              >
                {n.from_user ? (
                  <PersonAvatar
                    user={n.from_user}
                    name={
                      list.data?.user_info[n.from_user]?.fullname ?? n.from_user
                    }
                  />
                ) : (
                  <BellIcon className="mt-0.5 size-4 text-muted-foreground" />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-sm leading-snug",
                      !n.read && "font-medium"
                    )}
                  >
                    {text(n.subject)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(n.creation)}
                  </span>
                </span>
                {!n.read && (
                  <span
                    aria-label="Unread"
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                  />
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
