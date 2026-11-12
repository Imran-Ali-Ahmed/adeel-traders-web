"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Theme is switched with the button in the top bar (components/app-shell.tsx).
// The template's single-key "d" shortcut was removed: a stray key press must not change
// the theme in a business app, and it crashed on autofill events that carry no key.
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
