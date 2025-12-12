import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { RevueToolContainer } from "@/components/revue-tool/revue-tool-container"

export default async function RevueToolPage() {
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
        <DashboardHeader user={userData} />
        <main className="flex-1 overflow-hidden bg-gray-50">
          <RevueToolContainer />
        </main>
      </div>
    </div>
  )
}
