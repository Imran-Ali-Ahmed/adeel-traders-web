import { AppShell } from "@/components/app-shell"
import { SessionGate } from "@/components/session"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <AppShell>{children}</AppShell>
    </SessionGate>
  )
}
