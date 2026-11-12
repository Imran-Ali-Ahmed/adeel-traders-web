import { RequireCan } from "@/components/session"

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="products.view">{children}</RequireCan>
}
