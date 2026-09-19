import { NavigationPathTracker } from "@/components/navigation-path-tracker"
import { PermissionProviderShell } from "@/components/permission-provider-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { CreativeUploadShell } from "@/components/uploads/creative-upload-shell"
import { appFontClassName } from "@/lib/fonts"
import { getActiveOrganization } from "@/lib/get-active-organization"
import { getUserPermissions } from "@/lib/get-user-permissions"
import type { PermissionKey } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"

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

  if (user) {
    const organization = await getActiveOrganization(supabase, user.id)
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
    </ThemeProvider>
  )
}
