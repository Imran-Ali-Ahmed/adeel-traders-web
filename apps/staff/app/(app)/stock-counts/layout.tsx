import { RequireCan } from "@/components/session"

export default function StockCountsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="stock.count">{children}</RequireCan>
}
