import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { AccountContent } from "@/components/account/account-content"

type TabType = "profile" | "settings" | "team" | "organisations" | "billing" | "roles"

const validTabs: TabType[] = ["profile", "settings", "team", "organisations", "billing", "roles"]

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

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

  // Validate and get the tab from URL params
  const tabParam = params.tab as TabType | undefined
  const defaultTab: TabType = tabParam && validTabs.includes(tabParam) ? tabParam : "profile"

  return (
    <div className="flex flex-col h-svh">
      <StudioHeader user={userData} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} />
        <AccountContent user={userData} defaultTab={defaultTab} />
      </div>
    </div>
  )
}
