import { OrgSwitchProvider } from "@/contexts/org-switch-context"
import { OrgSwitchAwareMain } from "@/components/org-switch-aware-main"
import { StudioHeader } from "@/components/studio-header"
import { AppSidebar } from "@/components/app-sidebar"
import { QuickAnalysisUpload } from "@/components/quick-analysis/quick-analysis-upload"
import {
  getQuickAnalysisClientDirectory,
  getQuickAnalysisTeamMembers,
  requireQuickAnalysisPageContext,
} from "@/lib/quick-analysis-page-auth"

export const dynamic = "force-dynamic"

export default async function QuickAnalysisPage() {
  const ctx = await requireQuickAnalysisPageContext()

  const [clientDirectory, teamMembers] = await Promise.all([
    getQuickAnalysisClientDirectory(ctx.organizationId),
    getQuickAnalysisTeamMembers(ctx.organizationId),
  ])

  return (
    <OrgSwitchProvider currentOrgId={ctx.organizationId}>
      <div className="flex h-svh flex-col">
        <StudioHeader
          user={ctx.user}
          userId={ctx.userId}
          organizationId={ctx.organizationId}
          organizationName={ctx.organizationName}
          organizationLogoUrl={ctx.organizationLogoUrl}
          currentOrgId={ctx.organizationId}
          organizations={ctx.organizations}
          clientDirectory={clientDirectory}
          teamMembers={teamMembers}
          userRole={ctx.userRole}
        />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar user={ctx.user} userRole={ctx.userRole} />
          <OrgSwitchAwareMain>
            <QuickAnalysisUpload organizationId={ctx.organizationId} />
          </OrgSwitchAwareMain>
        </div>
      </div>
    </OrgSwitchProvider>
  )
}
