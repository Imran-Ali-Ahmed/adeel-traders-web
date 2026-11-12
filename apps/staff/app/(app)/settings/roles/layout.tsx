import { RequireCan } from "@/components/session"

export default function RolesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="roles.manage">{children}</RequireCan>
}
