import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { StudioHeader } from "@/components/studio-header"
import { getUserRole } from "@/lib/get-user-role"
import { MessageCircleQuestion, BookOpen, Mail, ExternalLink } from "lucide-react"

export default async function HelpDeskPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { role: userRole, clientId } = await getUserRole(supabase, user.id)

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,avatar_url")
    .eq("id", user.id)
    .single()

  const userData = {
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User",
    email: user.email || "",
    avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
  }

  const { data: ownedOrgs } = await supabase
    .from("organizations")
    .select("id,name,logo_url")
    .eq("created_by", user.id)

  let organization = ownedOrgs?.[0] ?? null

  if (!organization) {
    const { data: memberOrg } = await supabase
      .from("organization_members")
      .select("organizations(id,name,logo_url)")
      .eq("user_id", user.id)
      .limit(1)
      .single()

    if (memberOrg?.organizations) {
      organization = memberOrg.organizations as unknown as { id: string; name: string; logo_url: string | null }
    }
  }

  const helpItems = [
    {
      icon: "BookOpen",
      title: "Getting Started",
      description: "Learn the basics of using Revue for design reviews and collaboration.",
      items: [
        "Create your first client and project",
        "Upload creatives and share iterations",
        "Invite team members and assign roles",
        "Use the feedback tools on the canvas",
      ],
    },
    {
      icon: "MessageCircleQuestion",
      title: "FAQs",
      description: "Quick answers to common questions.",
      items: [
        "How do I invite a client to review designs?",
        "Can I control what clients see?",
        "How do iterations and versions work?",
        "What's the difference between Creative and Productive mode?",
      ],
    },
  ]

  return (
    <div className="flex flex-col h-svh">
      <StudioHeader
        user={userData}
        organizationId={organization?.id ?? null}
        organizationLogoUrl={organization?.logo_url ?? null}
        clientDirectory={[]}
        teamMembers={[]}
        userRole={userRole}
      />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar user={userData} userRole={userRole} clientId={clientId} />
        <main className="flex-1 overflow-auto bg-background">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <div className="mb-10">
              <h1 className="text-2xl font-bold text-foreground">Help Desk</h1>
              <p className="text-muted-foreground mt-1">
                Resources and support to help you get the most out of Revue.
              </p>
            </div>

            <div className="grid gap-6">
              {/* Getting Started */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#5C6ECD]/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-[#5C6ECD]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Getting Started</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Learn the basics of using Revue for design reviews and collaboration.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5 ml-14">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5C6ECD] shrink-0" />
                    Create your first client and project
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5C6ECD] shrink-0" />
                    Upload creatives and share iterations
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5C6ECD] shrink-0" />
                    Invite team members and assign roles
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5C6ECD] shrink-0" />
                    Use the feedback tools on the canvas
                  </li>
                </ul>
              </div>

              {/* FAQs */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <MessageCircleQuestion className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">FAQs</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Quick answers to common questions.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5 ml-14">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    How do I invite a client to review designs?
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    Can I control what clients see?
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    How do iterations and versions work?
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    What's the difference between Creative and Productive mode?
                  </li>
                </ul>
              </div>

              {/* Contact */}
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Need more help?</h2>
                    <p className="text-sm text-muted-foreground mt-0.5 mb-4">
                      Reach out to our team and we'll get back to you within 24 hours.
                    </p>
                    <a
                      href="mailto:hello@revue.studio"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#5C6ECD] hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      hello@revue.studio
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
