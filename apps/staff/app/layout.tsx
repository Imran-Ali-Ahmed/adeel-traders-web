import type { Metadata } from "next"
import { Bricolage_Grotesque, Manrope } from "next/font/google"

import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"

import { Providers } from "@/components/providers"

// Bricolage Grotesque gives headings and big numbers their character; Manrope keeps
// dense tables readable (and has tabular figures for prices and quantities).
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
})
const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Adeel Traders",
  description: "Back office for Adeel Traders",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans text-[15px] antialiased",
        display.variable,
        body.variable
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
