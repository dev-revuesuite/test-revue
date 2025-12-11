import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

export default async function DashboardPage() {
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
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="bg-muted/50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Welcome back, {userData.name}!
              </h2>
              <p className="text-muted-foreground">
                You&apos;re signed in as {userData.email}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-muted/50 aspect-video rounded-lg"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
