import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { Clock } from "lucide-react"

export default async function RecentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const userData = {
    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    email: user.email || "",
    avatar: user.user_metadata?.avatar_url || "",
  }

  return (
    <div className="flex h-svh">
      <AppSidebar user={userData} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <StudioHeader
          user={userData}
          organizationId={null}
          organizationLogoUrl={null}
          clientDirectory={[]}
        />
        <main className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center">
            <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-semibold mb-2">Recents</h1>
            <p className="text-muted-foreground">Your recently accessed items will appear here</p>
          </div>
        </main>
      </div>
    </div>
  )
}
