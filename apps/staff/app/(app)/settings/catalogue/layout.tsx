import { RequireCan } from "@/components/session"

export default function CatalogueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="catalogue.manage">{children}</RequireCan>
}
