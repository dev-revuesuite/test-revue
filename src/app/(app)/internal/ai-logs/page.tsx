import { notFound, redirect } from "next/navigation"

import { AiLogsDashboard } from "@/components/internal/ai-logs-dashboard"
import { isPlatformDeveloper } from "@/lib/platform-developer-access"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function InternalAiLogsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  if (!isPlatformDeveloper(user.id)) {
    notFound()
  }

  return (
    <main className="bg-background flex min-h-[calc(100vh-0px)] flex-col">
      <AiLogsDashboard />
    </main>
  )
}
