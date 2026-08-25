import { NavigationPathTracker } from "@/components/navigation-path-tracker"
import { ThemeProvider } from "@/components/theme-provider"
import { CreativeUploadShell } from "@/components/uploads/creative-upload-shell"
import { appFontClassName } from "@/lib/fonts"

export default function AppLayout({
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
      <div className={appFontClassName}>
        <CreativeUploadShell>
          <NavigationPathTracker />
          {children}
        </CreativeUploadShell>
      </div>
    </ThemeProvider>
  )
}
