import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { Settings } from "lucide-react"
import { getUserRole } from "@/lib/get-user-role"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { role: userRole, clientId } = await getUserRole(supabase, user.id)

  const userData = {
    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    email: user.email || "",
    avatar: user.user_metadata?.avatar_url || "",
  }

  return (
    <div className="flex h-svh">
      <AppSidebar user={userData} userRole={userRole} clientId={clientId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <StudioHeader
          user={userData}
          organizationId={null}
          organizationLogoUrl={null}
          clientDirectory={[]}
          userRole={userRole}
        />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <Settings className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-semibold mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
        </main>
      </div>
    </div>
  )
}
