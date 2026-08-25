import { ThemeProvider } from "@/components/theme-provider"
import { authFontClassName } from "@/lib/fonts"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <div className={authFontClassName}>{children}</div>
    </ThemeProvider>
  )
}
