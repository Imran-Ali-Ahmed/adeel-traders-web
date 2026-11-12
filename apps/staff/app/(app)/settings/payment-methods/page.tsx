"use client"

import { WalletIcon } from "lucide-react"

import { MasterListPage } from "@/components/settings/master-list"

export default function PaymentMethodsPage() {
  return (
    <MasterListPage
      kind="payment-methods"
      title="Payment methods"
      description="The ways customers pay and the business pays: cash, bank transfer, JazzCash, Easypaisa, card."
      noun="payment method"
      usedWord="payments"
      icon={WalletIcon}
      tone="emerald"
      note="Which bank or cash account each method pays into is set up with the accounts, in the next phase."
    />
  )
}
