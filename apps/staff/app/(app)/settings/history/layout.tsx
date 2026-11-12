import { RequireCan } from "@/components/session"

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="audit.view">{children}</RequireCan>
}
