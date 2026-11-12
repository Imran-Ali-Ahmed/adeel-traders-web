import { RequireCan } from "@/components/session"

export default function PeopleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="users.manage">{children}</RequireCan>
}
