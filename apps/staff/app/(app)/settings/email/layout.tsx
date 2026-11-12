import { RequireCan } from "@/components/session"

export default function EmailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="email.manage">{children}</RequireCan>
}
