"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { Spinner } from "@workspace/ui/components/spinner"

import { ChangePasswordScreen } from "@/components/change-password"
import { NoAccess } from "@/components/no-access"
import { api, type CapabilityName, type Session } from "@/lib/api"
import { FrappeError, setCsrfToken } from "@/lib/frappe"

const SessionContext = React.createContext<Session | null>(null)

export function useSession() {
  const session = React.useContext(SessionContext)
  if (!session) throw new Error("useSession must be used inside <SessionGate>")
  return session
}

/**
 * Whether the signed-in user may do something. The server decides (see docs/PERMISSIONS.md);
 * this only hides what the server would refuse anyway, every API call is checked again there.
 */
export function useCan(capability: CapabilityName): boolean {
  return useSession().capabilities[capability] === true
}

/** Shows the page only to users who have the capability, otherwise a clear "no access" screen. */
export function RequireCan({
  capability,
  children,
}: {
  capability: CapabilityName
  children: React.ReactNode
}) {
  const { capabilities } = useSession()
  return capabilities[capability] ? (
    <>{children}</>
  ) : (
    <NoAccess capabilities={capabilities} />
  )
}

/** Loads the signed-in user (and CSRF token) before showing any app screen. */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data, error } = useQuery({
    queryKey: ["session"],
    queryFn: api.me,
    staleTime: Infinity,
  })

  React.useEffect(() => {
    if (data) setCsrfToken(data.csrf_token)
  }, [data])

  React.useEffect(() => {
    if (
      error instanceof FrappeError &&
      (error.status === 401 || error.status === 403)
    ) {
      router.replace("/login")
    }
  }, [error, router])

  if (!data) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        {error ? <p>{error.message}</p> : <Spinner />}
      </div>
    )
  }

  if (data.must_change_password) {
    return <ChangePasswordScreen name={data.full_name || data.user} />
  }

  return (
    <SessionContext.Provider value={data}>{children}</SessionContext.Provider>
  )
}
