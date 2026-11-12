import { RequireCan } from "@/components/session"

export default function PaymentMethodsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <RequireCan capability="payments.manage">{children}</RequireCan>
}
