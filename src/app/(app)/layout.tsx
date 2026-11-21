import { NavigationPathTracker } from "@/components/navigation-path-tracker"
import { PermissionProviderShell } from "@/components/permission-provider-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { TimezoneProvider } from "@/contexts/timezone-context"
import { CreativeUploadShell } from "@/components/uploads/creative-upload-shell"
import { PlanLimitDialogHost } from "@/components/plans/plan-limit-dialog-host"
import { UpgradeDialogHost } from "@/components/billing/upgrade-dialog-host"
import { PaymentIssueBar } from "@/components/billing/payment-issue-bar"
import { getFailingPayment } from "@/lib/billing/failing-payment"
import { appFontClassName } from "@/lib/fonts"
import { getActiveOrganization } from "@/lib/get-active-organization"
import { getRequestTimeZone } from "@/lib/get-request-timezone"
import { getUserPermissions } from "@/lib/get-user-permissions"
import { ALL_PLAN_FEATURES_INCLUDED, getPlanFeatures } from "@/lib/plan-features"
import { PlanFeaturesProvider } from "@/contexts/plan-features-context"
import { TrialReminders } from "@/components/plans/trial-reminders"
import { getOrgTrialStatus, NO_TRIAL } from "@/lib/trial"
import type { PermissionKey } from "@/lib/permissions"
import { createClient, getAuthUser } from "@/lib/supabase/server"
import { parseTimezonePreference } from "@/lib/timezone-preference"
import { AppLayoutLoadingShell } from "@/components/studio/studio-loading-skeletons"
import { Suspense } from "react"

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <div className={appFontClassName}>
        {/* Paint the loading shell before the auth and permission lookups finish. */}
        <Suspense fallback={<AppLayoutLoadingShell />}>
          <AppProviders>{children}</AppProviders>
        </Suspense>
      </div>
    </ThemeProvider>
  )
}

async function AppProviders({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const user = await getAuthUser()

  let permissionKeys: PermissionKey[] = []
  let isOrgOwner = false
  let customRoleTitle: string | null = null
  let timezonePreference = "system"
  let resolvedTimeZone = "UTC"
  let planFeatures = ALL_PLAN_FEATURES_INCLUDED
  let trial = NO_TRIAL
  let organizationId: string | null = null
  let paymentIssue: { graceEndsAt: string | null } | null = null

  if (user) {
    const [organization, prefsResult] = await Promise.all([
      getActiveOrganization(supabase, user.id),
      supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .maybeSingle(),
    ])
    timezonePreference = parseTimezonePreference(
      (prefsResult.data?.preferences as Record<string, unknown> | null)
        ?.timezone
    )
    resolvedTimeZone = await getRequestTimeZone(timezonePreference)
    if (organization) {
      organizationId = organization.id
      const [permissionsResult, features, trialStatus, failingPayment] = await Promise.all([
        getUserPermissions(supabase, user.id, organization.id),
        getPlanFeatures(supabase, organization.id),
        getOrgTrialStatus(supabase, organization.id),
        getFailingPayment(supabase, user.id),
      ])
      paymentIssue = failingPayment
      planFeatures = features
      trial = trialStatus
      permissionKeys = [...permissionsResult.permissions]
      isOrgOwner = permissionsResult.isOrgOwner
      customRoleTitle = permissionsResult.customRoleTitle
    }
  }

  return (
    <TimezoneProvider
      preference={timezonePreference}
      resolvedTimeZone={resolvedTimeZone}
    >
      <PermissionProviderShell
        permissionKeys={permissionKeys}
        isOrgOwner={isOrgOwner}
        customRoleTitle={customRoleTitle}
      >
        <PlanFeaturesProvider
          features={planFeatures}
          trial={trial}
          billing={{
            organizationId,
            email: user?.email ?? null,
            name: (user?.user_metadata?.full_name as string | undefined) ?? null,
            paymentIssue,
          }}
        >
          <CreativeUploadShell>
            <NavigationPathTracker />
            <PlanLimitDialogHost />
            <TrialReminders />
            <UpgradeDialogHost />
            <PaymentIssueBar />
            {children}
          </CreativeUploadShell>
        </PlanFeaturesProvider>
      </PermissionProviderShell>
    </TimezoneProvider>
  )
}
