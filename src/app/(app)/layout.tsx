import { NavigationPathTracker } from "@/components/navigation-path-tracker"
import { PermissionProviderShell } from "@/components/permission-provider-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { TimezoneProvider } from "@/contexts/timezone-context"
import { CreativeUploadShell } from "@/components/uploads/creative-upload-shell"
import { appFontClassName } from "@/lib/fonts"
import { getActiveOrganization } from "@/lib/get-active-organization"
import { getRequestTimeZone } from "@/lib/get-request-timezone"
import { getUserPermissions } from "@/lib/get-user-permissions"
import type { PermissionKey } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { parseTimezonePreference } from "@/lib/timezone-preference"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let permissionKeys: PermissionKey[] = []
  let isOrgOwner = false
  let customRoleTitle: string | null = null
  let timezonePreference = "system"
  let resolvedTimeZone = "UTC"

  if (user) {
    const [organization, prefsResult] = await Promise.all([
      getActiveOrganization(supabase, user.id),
      supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .maybeSingle(),
    ])
    timezonePreference = parseTimezonePreference(
      (prefsResult.data?.preferences as Record<string, unknown> | null)
        ?.timezone
    )
    resolvedTimeZone = await getRequestTimeZone(timezonePreference)
    if (organization) {
      const permissionsResult = await getUserPermissions(
        supabase,
        user.id,
        organization.id
      )
      permissionKeys = [...permissionsResult.permissions]
      isOrgOwner = permissionsResult.isOrgOwner
      customRoleTitle = permissionsResult.customRoleTitle
    }
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <TimezoneProvider
        preference={timezonePreference}
        resolvedTimeZone={resolvedTimeZone}
      >
        <PermissionProviderShell
          permissionKeys={permissionKeys}
          isOrgOwner={isOrgOwner}
          customRoleTitle={customRoleTitle}
        >
          <div className={appFontClassName}>
            <CreativeUploadShell>
              <NavigationPathTracker />
              {children}
            </CreativeUploadShell>
          </div>
        </PermissionProviderShell>
      </TimezoneProvider>
    </ThemeProvider>
  )
}
