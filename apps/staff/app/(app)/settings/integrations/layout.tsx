import { RequireCan } from "@/components/session"

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="integrations.view">{children}</RequireCan>
}
