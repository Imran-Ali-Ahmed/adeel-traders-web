"use client"

import { Suspense } from "react"
import { ChartColumnIcon } from "lucide-react"

import { ReportView } from "@/components/reports/report-view"

export default function StockBalancePage() {
  return (
    <Suspense>
      <ReportView report="stock-balance" icon={ChartColumnIcon} tone="teal" />
    </Suspense>
  )
}
