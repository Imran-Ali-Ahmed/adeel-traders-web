"use client"

import * as React from "react"
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"

import { Toaster } from "@workspace/ui/components/toast"
import { TooltipProvider } from "@workspace/ui/components/tooltip"

import { ThemeProvider } from "@/components/theme-provider"
import { FrappeError } from "@/lib/frappe"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => {
    const client: QueryClient = new QueryClient({
      // Every save adds to some record's change history (P1.5): show it straight away.
      mutationCache: new MutationCache({
        onSuccess: () => client.invalidateQueries({ queryKey: ["history"] }),
      }),
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          refetchOnWindowFocus: false,
          // Don't retry permission or validation errors; they won't fix themselves.
          retry: (count, error) =>
            !(error instanceof FrappeError && error.status < 500) && count < 2,
        },
      },
    })
    return client
  })

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster>{children}</Toaster>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
