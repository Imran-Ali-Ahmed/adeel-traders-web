import { RequireCan } from "@/components/session"

export default function ApprovalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="approvals.inbox">{children}</RequireCan>
}
