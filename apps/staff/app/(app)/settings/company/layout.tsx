import { RequireCan } from "@/components/session"

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="company.manage">{children}</RequireCan>
}
