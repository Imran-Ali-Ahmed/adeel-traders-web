import { RequireCan } from "@/components/session"

export default function UnitsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="units.manage">{children}</RequireCan>
}
