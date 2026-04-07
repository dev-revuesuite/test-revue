"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Building2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { switchOrganization } from "@/lib/actions/switch-organization"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Organization {
  id: string
  name: string
  logo_url: string | null
  role: string
}

interface OrgSwitcherProps {
  currentOrgId: string
  currentOrgName: string
  currentOrgLogo: string | null
  organizations: Organization[]
}

function OrgAvatar({ name, logoUrl, size = "sm" }: { name: string; logoUrl: string | null; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const sizeClasses = size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]"

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={cn(sizeClasses, "rounded-md object-cover")}
      />
    )
  }

  return (
    <div
      className={cn(
        sizeClasses,
        "rounded-md bg-[#5C6ECD] text-white font-semibold flex items-center justify-center shrink-0"
      )}
    >
      {initials}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const label = role === "owner" ? "Owner" : role === "admin" ? "Admin" : role === "designer" ? "Designer" : role === "client" ? "Client" : "Member"

  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#f0f0f0] dark:bg-[#333] text-[#7a7a7a] dark:text-[#999]">
      {label}
    </span>
  )
}

export function OrgSwitcher({
  currentOrgId,
  currentOrgName,
  currentOrgLogo,
  organizations,
}: OrgSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [switchingTo, setSwitchingTo] = React.useState<string | null>(null)

  // Reset loading state when the active org changes (means switch completed)
  React.useEffect(() => {
    setSwitchingTo(null)
    setOpen(false)
  }, [currentOrgId])

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrgId) {
      setOpen(false)
      return
    }

    setSwitchingTo(orgId)

    const result = await switchOrganization(orgId)

    if (result.success) {
      setOpen(false)
      router.refresh()
    } else {
      console.error("Failed to switch organization:", result.error)
      setSwitchingTo(null)
    }
  }

  // Don't show the dropdown trigger if there's only 1 org
  const hasMultipleOrgs = organizations.length > 1

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
            hasMultipleOrgs
              ? "hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] cursor-pointer"
              : "cursor-default"
          )}
          disabled={!hasMultipleOrgs}
        >
          <OrgAvatar name={currentOrgName} logoUrl={currentOrgLogo} size="md" />
          <span className="text-sm font-semibold text-[#1a1a1a] dark:text-white max-w-[140px] truncate">
            {currentOrgName}
          </span>
          {hasMultipleOrgs && (
            <ChevronDown className="w-3.5 h-3.5 text-[#7a7a7a] dark:text-[#999] shrink-0" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-1.5"
        align="start"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-2.5 py-2 mb-1">
          <p className="text-[10px] font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider">
            Switch Organization
          </p>
        </div>

        {/* Org List */}
        <div className="space-y-0.5 max-h-64 overflow-auto">
          {organizations.map((org) => {
            const isActive = org.id === currentOrgId
            const isSwitching = switchingTo === org.id

            return (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                disabled={isSwitching}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors group text-left",
                  isActive
                    ? "bg-[#f0f7ff] dark:bg-[#1a2a3a]"
                    : "hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]",
                  isSwitching && "opacity-60"
                )}
              >
                <OrgAvatar name={org.name} logoUrl={org.logo_url} size="md" />

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isActive
                      ? "text-[#5C6ECD]"
                      : "text-[#1a1a1a] dark:text-white"
                  )}>
                    {org.name}
                  </p>
                  <RoleBadge role={org.role} />
                </div>

                {isSwitching ? (
                  <Loader2 className="w-4 h-4 text-[#5C6ECD] animate-spin shrink-0" />
                ) : isActive ? (
                  <Check className="w-4 h-4 text-[#5C6ECD] shrink-0" />
                ) : null}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
