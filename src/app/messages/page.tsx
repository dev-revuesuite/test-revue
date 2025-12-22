import { redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { MessagesContent } from "@/components/messages/messages-content"
import { MessagesSkeleton } from "@/components/messages/messages-skeleton"

export default async function MessagesPage() {
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
        <StudioHeader user={userData} />
        <Suspense fallback={<MessagesSkeleton />}>
          <MessagesContent />
        </Suspense>
      </div>
    </div>
  )
}
