import type { Metadata } from "next"

import { NotFoundContent } from "@/components/not-found-content"
import { ThemeProvider } from "@/components/theme-provider"
import { authFontClassName } from "@/lib/fonts"

export const metadata: Metadata = {
  title: "404 — Page Not Found | Revue",
}

export default function NotFound() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <div className={authFontClassName}>
        <NotFoundContent />
      </div>
    </ThemeProvider>
  )
}
