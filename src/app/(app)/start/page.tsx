import { redirect } from "next/navigation"

import { StartPlanChooser } from "@/components/billing/start-plan-chooser"
import { isBillingEnabled } from "@/lib/billing/plan-prices"
import { getActiveOrganization } from "@/lib/get-active-organization"
import { isOrgOwner } from "@/lib/is-org-owner"
import { createClient, getAuthUser } from "@/lib/supabase/server"
import { getOrgTrialStatus } from "@/lib/trial"

export const dynamic = "force-dynamic"

/**
 * "How do you want to start?" after onboarding. Only for the owner of an
 * organization that is still on the free trial, and only while billing is
 * switched on; everyone else goes to Studio.
 */
export default async function StartPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")
  if (!isBillingEnabled()) redirect("/studio")

  const supabase = await createClient()
  const organization = await getActiveOrganization(supabase, user.id)
  if (!organization) redirect("/onboarding")

  const [owner, trial] = await Promise.all([
    isOrgOwner(supabase, user.id, organization.id),
    getOrgTrialStatus(supabase, organization.id),
  ])
  // Already paying (or an old org without a trial): nothing to choose here.
  if (!owner || trial.status !== "trial") redirect("/studio")

  // The chooser draws the whole screen (dark, like the onboarding steps before it).
  return <StartPlanChooser trialDays={trial.daysLeft} />
}
