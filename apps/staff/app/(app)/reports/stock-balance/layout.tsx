import { RequireCan } from "@/components/session"

export default function StockBalanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="reports.stock">{children}</RequireCan>
}
