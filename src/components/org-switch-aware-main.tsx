"use client"

import { useOrgSwitch } from "@/contexts/org-switch-context"
import { OrgSwitchGenericMainSkeleton } from "@/components/studio/studio-loading-skeletons"

export function OrgSwitchAwareMain({
  children,
  skeleton,
}: {
  children: React.ReactNode
  skeleton?: React.ReactNode
}) {
  const { isOrgSwitchLoading } = useOrgSwitch()

  if (isOrgSwitchLoading) {
    return skeleton ?? <OrgSwitchGenericMainSkeleton />
  }

  return children
}
