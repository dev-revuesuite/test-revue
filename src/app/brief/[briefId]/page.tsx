import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { BriefContent } from "@/components/brief/brief-content"

interface BriefPageProps {
  params: Promise<{ briefId: string }>
}

export default async function BriefPage({ params }: BriefPageProps) {
  const supabase = await createClient()
  const { briefId } = await params

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
    <div className="flex flex-col h-svh">
      <StudioHeader user={userData} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} />
        <BriefContent briefId={briefId} />
      </div>
    </div>
  )
}
