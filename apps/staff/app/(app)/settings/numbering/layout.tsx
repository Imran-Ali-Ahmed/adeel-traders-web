import { RequireCan } from "@/components/session"

export default function NumberingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="numbering.view">{children}</RequireCan>
}
