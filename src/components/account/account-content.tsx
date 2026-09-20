"use client"

import * as React from "react"
import { useState } from "react"
import {
  User,
  Building2,
  Shield,
  Settings,
  Plus,
  Search,
  ChevronDown,
  Check,
  Trash2,
  MapPin,
  X,
  Pencil,
  ArrowUpDown,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useTimezone } from "@/contexts/timezone-context"
import {
  parseTimezonePreference,
  timezoneDropdownOptions,
  timezoneOptionLabel,
} from "@/lib/timezone-preference"
import { appRoute } from "@/lib/base-path"
import { createClient } from "@/lib/supabase/client"
import { RolesTab } from "@/components/account/roles-tab"
import {
  inviteInternalMember,
  removeOrganizationMembers,
  updateMemberDetails,
} from "@/lib/team-member-service"
import { fetchOrganizationRoles } from "@/lib/organization-roles-service"
import { usePermission, usePermissions } from "@/contexts/permission-context"

interface OrgData {
  id: string
  name: string
  logo: string
  email: string
  phone: string
  website: string
  industry: string
  size: string
  country: string
  state: string
}

interface TeamMemberData {
  id: string
  name: string
  email: string
  phone: string
  role: string
  avatar: string
  userId: string | null
  customRoleId?: string | null
  roleTitle?: string
}

interface OrgRoleOption {
  id: string
  title: string
}

interface ProfileData {
  phone: string
  jobTitle: string
  preferences: Record<string, unknown>
}

interface AccountContentProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  defaultTab?: TabType
  organization?: OrgData | null
  teamMembers?: TeamMemberData[]
  profileData?: ProfileData
  organizationId?: string | null
  isOrgOwner?: boolean
  currentUserId?: string | null
  orgRoles?: OrgRoleOption[]
}

type TabType = "profile" | "settings" | "team" | "roles" | "organisations"

// mockTeamMembers removed — now uses real data from props

// mockOrganisations removed — now uses real data from props

export function AccountContent({ user, defaultTab = "profile", organization, teamMembers = [], profileData, organizationId, isOrgOwner = false, currentUserId = null, orgRoles = [] }: AccountContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab)

  const tabs: { id: TabType; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "settings", label: "Settings" },
    { id: "team", label: "Team" },
    ...(isOrgOwner ? [{ id: "roles" as TabType, label: "Roles" }] : []),
    { id: "organisations", label: "Organisations" },
  ]

  const handleTabChange = (id: TabType) => {
    setActiveTab(id)
    router.replace(appRoute(`/account?tab=${id}`))
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="w-full px-8 py-8">
        {/* Page Title */}
        <h1 className="text-2xl font-semibold text-foreground mb-6">
          {user.name}&apos;s account
        </h1>

        {/* Tabs - Notion style */}
        <div className="border-b border-border mb-8">
          <nav className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm transition-colors relative",
                  activeTab === tab.id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-200">
          {activeTab === "profile" && <ProfileTab user={user} profileData={profileData} />}
          {activeTab === "settings" && <SettingsTab initialPreferences={profileData?.preferences} />}
          {activeTab === "team" && (
            <TeamTab
              initialMembers={teamMembers}
              organizationId={organizationId ?? null}
              orgRoles={orgRoles}
              currentUserId={currentUserId ?? null}
            />
          )}
          {activeTab === "roles" && organizationId ? (
            <RolesTab organizationId={organizationId} isOrgOwner={isOrgOwner} />
          ) : null}
          {activeTab === "organisations" && (
            <OrganisationsTab initialOrg={organization} isOrgOwner={isOrgOwner} />
          )}
        </div>
      </div>
    </main>
  )
}

// Section Header Component
function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1 mt-8 first:mt-0">
      {icon}
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  )
}

// Editable Row Component
function EditableRow({
  label,
  value,
  onSave,
  type = "text",
  canEdit = true,
}: {
  label: string
  value: string
  onSave: (value: string) => void | Promise<void>
  type?: "text" | "email" | "tel"
  canEdit?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)

  React.useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch {
      // Stay in edit mode so the user can retry after the error banner.
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (isSaving) return
    setEditValue(value)
    setIsEditing(false)
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              disabled={isSaving}
              className="px-3 py-1.5 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 text-sm text-[#5C6ECD] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="text-sm text-muted-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">{value || "—"}</span>
            {canEdit ? (
              <button onClick={() => setIsEditing(true)} className="text-sm text-foreground hover:text-muted-foreground font-medium">
                Edit
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

// Profile Tab
function ProfileTab({ user, profileData }: { user: { name: string; email: string; avatar: string }; profileData?: ProfileData }) {
  const [profile, setProfile] = useState({
    fullName: user.name,
    email: user.email,
    phone: profileData?.phone || "",
    designation: profileData?.jobTitle || "",
  })
  const [avatarUrl, setAvatarUrl] = useState(user.avatar)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [isAvatarDeleting, setIsAvatarDeleting] = useState(false)

  const updateProfileField = async (field: string, value: string) => {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    const dbField = field === "fullName" ? "full_name" : field === "designation" ? "job_title" : field
    await supabase.from("profiles").update({ [dbField]: value }).eq("id", currentUser.id)
  }

  const handleAvatarUpload = async () => {
    if (isAvatarUploading) return
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setIsAvatarUploading(true)
      try {
        const ext = (file.name.split(".").pop() || "").replace(/[^A-Za-z0-9]+/g, "")
        const path = `${currentUser.id}/${Date.now()}-avatar${ext ? `.${ext}` : ""}`
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file)
        if (uploadErr) {
          console.error("Avatar upload failed:", uploadErr)
          return
        }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        const newUrl = urlData.publicUrl
        await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", currentUser.id)
        setAvatarUrl(newUrl)
      } finally {
        setIsAvatarUploading(false)
      }
    }
    input.click()
  }

  const handleDeleteAvatar = async () => {
    if (isAvatarDeleting || isAvatarUploading || !avatarUrl) return
    setIsAvatarDeleting(true)
    try {
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", currentUser.id)
      setAvatarUrl("")
    } finally {
      setIsAvatarDeleting(false)
    }
  }

  return (
    <div className="w-full">
      {/* Profile Photo */}
      <SectionHeader title="Profile Photo" />
      <div className="border-t border-border">
        <div className="flex items-center justify-between py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upload a photo to personalize your account</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAvatarUpload}
              disabled={isAvatarUploading || isAvatarDeleting}
              className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-muted-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAvatarUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Edit"
              )}
            </button>
            <button
              onClick={handleDeleteAvatar}
              disabled={isAvatarUploading || isAvatarDeleting}
              className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-muted-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAvatarDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <SectionHeader title="Personal Information" icon={<User className="w-4 h-4 text-muted-foreground" />} />
      <div className="border-t border-border">
        <EditableRow label="Full Name" value={profile.fullName} onSave={(v) => { setProfile({...profile, fullName: v}); updateProfileField("fullName", v) }} />
        <EditableRow label="Email Address" value={profile.email} onSave={(v) => { setProfile({...profile, email: v}); updateProfileField("email", v) }} type="email" />
        <EditableRow label="Phone Number" value={profile.phone} onSave={(v) => { setProfile({...profile, phone: v}); updateProfileField("phone", v) }} type="tel" />
        <EditableRow label="Designation" value={profile.designation} onSave={(v) => { setProfile({...profile, designation: v}); updateProfileField("designation", v) }} />
      </div>

      {/* Danger Zone */}
      <SectionHeader title="Danger zone" />
      <div className="border-t border-border">
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Closing your Account will permanently delete all your account information and you will no longer be able to use any of the services.
          </p>
          <button className="text-sm text-destructive hover:text-destructive/80 font-medium">
            Delete my account
          </button>
        </div>
      </div>
    </div>
  )
}

// Settings Tab
function themeFromAppearance(appearance: string): "light" | "dark" | "system" {
  if (appearance === "Light") return "light"
  if (appearance === "Dark") return "dark"
  return "system"
}

function appearanceLabelFromTheme(theme: string | undefined) {
  if (theme === "light") return "Light"
  if (theme === "dark") return "Dark"
  if (theme === "system") return "System"
  return null
}

function appearanceFromPrefs(prefs?: Record<string, unknown>) {
  const stored = prefs?.theme
  if (stored === "light") return "Light"
  if (stored === "dark") return "Dark"
  if (stored === "system") return "System"
  const appearance = prefs?.appearance
  if (appearance === "Light" || appearance === "Dark" || appearance === "System") {
    return appearance
  }
  return "System"
}

function SettingsTab({ initialPreferences }: { initialPreferences?: Record<string, unknown> }) {
  const { theme, setTheme } = useTheme()
  const { timeZone, setPreference: setTimezonePreference } = useTimezone()
  const [settings, setSettings] = useState({
    appearance: appearanceFromPrefs(initialPreferences),
    timezone: parseTimezonePreference(initialPreferences?.timezone),
    emailNotifications: initialPreferences?.emailNotifications !== false,
    pushNotifications: initialPreferences?.pushNotifications !== false,
  })
  const [actionError, setActionError] = useState<string | null>(null)
  const [showComingSoon, setShowComingSoon] = useState(false)
  const timezoneOptions = timezoneDropdownOptions(settings.timezone)

  React.useEffect(() => {
    setSettings((current) => ({
      ...current,
      timezone: parseTimezonePreference(initialPreferences?.timezone),
      emailNotifications: initialPreferences?.emailNotifications !== false,
      pushNotifications: initialPreferences?.pushNotifications !== false,
    }))
  }, [initialPreferences])

  React.useEffect(() => {
    if (!theme) return
    const label = appearanceLabelFromTheme(theme)
    if (!label) return
    setSettings((current) =>
      current.appearance === label ? current : { ...current, appearance: label }
    )
  }, [theme])

  const persistPreferencesPatch = async (patch: Record<string, unknown>) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      throw new Error("You must be signed in to save settings.")
    }

    const { data: profile, error: readError } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .maybeSingle()

    if (readError) {
      throw new Error(readError.message)
    }

    const current =
      (profile?.preferences as Record<string, unknown> | null) ?? {}
    const { error } = await supabase
      .from("profiles")
      .update({
        preferences: {
          ...current,
          ...patch,
        },
      })
      .eq("id", user.id)

    if (error) {
      throw new Error(error.message)
    }
  }

  const updateSetting = async <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    const previous = settings
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    setActionError(null)

    const previousTheme = themeFromAppearance(previous.appearance)
    if (key === "appearance") {
      setTheme(themeFromAppearance(String(value)))
    }
    if (key === "timezone") {
      setTimezonePreference(String(value))
    }

    try {
      const patch: Record<string, unknown> = { [key]: value }
      if (key === "appearance") {
        patch.theme = themeFromAppearance(String(value))
        patch.appearance = value
      }
      await persistPreferencesPatch(patch)
    } catch (err) {
      setSettings(previous)
      if (key === "appearance") {
        setTheme(previousTheme)
      }
      if (key === "timezone") {
        setTimezonePreference(previous.timezone)
      }
      setActionError(
        err instanceof Error ? err.message : "Could not save settings."
      )
    }
  }

  return (
    <div className="w-full">
      {actionError ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <SectionHeader title="Preferences" icon={<Settings className="w-4 h-4 text-muted-foreground" />} />
      <div className="border-t border-border">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-foreground">Appearance</span>
          <Dropdown
            value={settings.appearance}
            options={["System", "Light", "Dark"]}
            onChange={(v) => void updateSetting("appearance", v)}
          />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <span className="text-sm text-foreground">Timezone</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {settings.timezone === "system"
                ? `Using your device time (${timeZone.replace(/_/g, " ")})`
                : `Times shown in ${timezoneOptionLabel(settings.timezone)}`}
            </p>
          </div>
          <Dropdown
            value={timezoneOptionLabel(settings.timezone)}
            options={timezoneOptions.map((option) => option.label)}
            onChange={(label) => {
              const selected =
                timezoneOptions.find((option) => option.label === label)?.id ??
                "system"
              void updateSetting("timezone", selected)
            }}
            wide
          />
        </div>
      </div>

      <SectionHeader title="Notifications" />
      <div className="border-t border-border">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <span className="text-sm text-foreground">Email notifications</span>
            <p className="text-xs text-muted-foreground mt-0.5">Coming soon — preference is saved for later</p>
          </div>
          <Toggle checked={settings.emailNotifications} onChange={(v) => void updateSetting("emailNotifications", v)} />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <span className="text-sm text-foreground">Push notifications</span>
            <p className="text-xs text-muted-foreground mt-0.5">Coming soon — preference is saved for later</p>
          </div>
          <Toggle checked={settings.pushNotifications} onChange={(v) => void updateSetting("pushNotifications", v)} />
        </div>
      </div>

      <SectionHeader title="Security" icon={<Shield className="w-4 h-4 text-muted-foreground" />} />
      <div className="border-t border-border">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <span className="text-sm text-foreground">Two-factor authentication</span>
            <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <button
            type="button"
            onClick={() => setShowComingSoon(true)}
            className="text-sm text-foreground hover:text-muted-foreground font-medium"
          >
            Coming soon
          </button>
        </div>
      </div>

      {showComingSoon ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Coming soon</h2>
              <button
                type="button"
                onClick={() => setShowComingSoon(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication is not available yet. We will add it in a later update.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowComingSoon(false)}
                className="px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type FullTeamMember = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  customRoleId?: string | null
  roleTitle?: string
  userId: string | null
  avatar: string
  status: "active" | "inactive"
}

function toFullMember(m: TeamMemberData): FullTeamMember {
  return {
    ...m,
    userId: m.userId ?? null,
    status: m.userId ? "active" : "inactive",
  }
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  return initials || "?"
}

function isOwnerMember(member: FullTeamMember) {
  return member.role === "owner"
}

function isSelfMember(member: FullTeamMember, currentUserId: string | null) {
  return !!member.userId && !!currentUserId && member.userId === currentUserId
}

function isPersistedMember(member: FullTeamMember) {
  return !member.id.startsWith("owner:")
}

function TeamTab({
  initialMembers = [],
  organizationId,
  orgRoles = [],
  currentUserId = null,
}: {
  initialMembers?: TeamMemberData[]
  organizationId: string | null
  orgRoles?: OrgRoleOption[]
  currentUserId?: string | null
}) {
  const { isOrgOwner } = usePermissions()
  const canAddTeamMember = usePermission("add_team_member")
  const canManageTeam = isOrgOwner || canAddTeamMember
  const [liveOrgRoles, setLiveOrgRoles] = useState<OrgRoleOption[]>(orgRoles)
  const [rolesLoading, setRolesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [groupFilter, setGroupFilter] = useState("All")
  const [members, setMembers] = useState<FullTeamMember[]>(initialMembers.map(toFullMember))
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingMember, setEditingMember] = useState<FullTeamMember | null>(null)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [teamActionError, setTeamActionError] = useState<string | null>(null)
  const router = useRouter()

  const refreshOrgRoles = React.useCallback(async () => {
    if (!organizationId) return
    setRolesLoading(true)
    const supabase = createClient()
    const roles = await fetchOrganizationRoles(supabase, organizationId)
    setLiveOrgRoles(roles.map((r) => ({ id: r.id, title: r.title })))
    setRolesLoading(false)
  }, [organizationId])

  React.useEffect(() => {
    setLiveOrgRoles(orgRoles)
  }, [orgRoles])

  React.useEffect(() => {
    setMembers(initialMembers.map(toFullMember))
  }, [initialMembers])

  React.useEffect(() => {
    void refreshOrgRoles()
  }, [refreshOrgRoles])

  React.useEffect(() => {
    if (showInviteModal || editingMember) {
      void refreshOrgRoles()
    }
  }, [showInviteModal, editingMember, refreshOrgRoles])

  const roleIdByTitle = new Map(liveOrgRoles.map((r) => [r.title, r.id]))
  const groupOptions = ["All", ...liveOrgRoles.map((r) => r.title)]

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "All" ||
      (statusFilter === "Active" && member.status === "active") ||
      (statusFilter === "Inactive" && member.status === "inactive")
    const matchesGroup =
      groupFilter === "All" ||
      (member.roleTitle ?? member.role) === groupFilter
    return matchesSearch && matchesStatus && matchesGroup
  })

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sortOrder === "asc") return a.name.localeCompare(b.name)
    return b.name.localeCompare(a.name)
  })

  const canDeleteMember = (member: FullTeamMember) =>
    canManageTeam && !isOwnerMember(member) && !isSelfMember(member, currentUserId)

  const deletableSortedIds = sortedMembers
    .filter((member) => canDeleteMember(member))
    .map((member) => member.id)

  const toggleSelectAll = () => {
    const allDeletableSelected =
      deletableSortedIds.length > 0 &&
      deletableSortedIds.every((id) => selectedMembers.includes(id))
    if (allDeletableSelected) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(deletableSortedIds)
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id))
    } else {
      setSelectedMembers([...selectedMembers, id])
    }
  }

  const requestDelete = (ids: string[]) => {
    const removable = ids.filter((id) => {
      const member = members.find((m) => m.id === id)
      return member ? canDeleteMember(member) : false
    })

    if (removable.length === 0) {
      setTeamActionError("You cannot remove the owner or yourself.")
      return
    }

    if (removable.length !== ids.length) {
      setTeamActionError("The owner and your own account were skipped.")
    } else {
      setTeamActionError(null)
    }

    setPendingDeleteIds(removable)
  }

  const removeMembers = async (ids: string[]) => {
    if (!canManageTeam || ids.length === 0) return

    const blocked = ids.some((id) => {
      const member = members.find((m) => m.id === id)
      return !member || !canDeleteMember(member)
    })
    if (blocked) {
      setTeamActionError("You cannot remove the owner or yourself.")
      return
    }

    const previousMembers = members
    setTeamActionError(null)
    setMembers(members.filter((m) => !ids.includes(m.id)))
    setSelectedMembers((current) => current.filter((id) => !ids.includes(id)))

    const supabase = createClient()
    const { error } = await removeOrganizationMembers(supabase, ids)

    if (error) {
      setMembers(previousMembers)
      setTeamActionError(error)
      return
    }

    router.refresh()
  }

  const confirmPendingDelete = async () => {
    if (isDeleting || pendingDeleteIds.length === 0) return
    setIsDeleting(true)
    try {
      await removeMembers(pendingDeleteIds)
      setPendingDeleteIds([])
    } finally {
      setIsDeleting(false)
    }
  }

  const updateMember = async (updatedMember: FullTeamMember): Promise<boolean> => {
    if (!canManageTeam || !organizationId) return false

    const previousMember = members.find((m) => m.id === updatedMember.id)
    if (!previousMember) return false

    const customRoleId =
      updatedMember.customRoleId ??
      roleIdByTitle.get(updatedMember.roleTitle ?? updatedMember.role) ??
      null

    if (!customRoleId) {
      setTeamActionError("Select a valid role before saving.")
      return false
    }

    setTeamActionError(null)
    setMembers(members.map((m) => (m.id === updatedMember.id ? updatedMember : m)))

    const supabase = createClient()
    const { error } = await updateMemberDetails(supabase, {
      memberId: updatedMember.id,
      name: updatedMember.name,
      email: updatedMember.email,
      phone: updatedMember.phone,
      customRoleId,
    })

    if (error) {
      setMembers((current) =>
        current.map((m) => (m.id === updatedMember.id ? previousMember : m))
      )
      setTeamActionError(error)
      return false
    }

    router.refresh()
    return true
  }

  const handleInviteMember = async (data: {
    name: string
    email: string
    customRoleId: string
    roleTitle: string
  }): Promise<string | null> => {
    if (!organizationId) return "Organization not found."
    const supabase = createClient()
    const { memberId, error } = await inviteInternalMember(supabase, {
      organizationId,
      name: data.name,
      email: data.email,
      customRoleId: data.customRoleId,
    })
    if (error || !memberId) {
      const message = error || "Failed to invite member. Please try again."
      setTeamActionError(message)
      return message
    }
    setTeamActionError(null)
    const newMember = toFullMember({
      id: memberId,
      name: data.name,
      email: data.email,
      phone: "",
      role: "member",
      avatar: "",
      userId: null,
      customRoleId: data.customRoleId,
      roleTitle: data.roleTitle,
    })
    setMembers([...members, newMember])
    setStatusFilter("All")
    setShowInviteModal(false)
    router.refresh()
    return null
  }

  return (
    <div className="w-full">
      {teamActionError ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {teamActionError}
        </div>
      ) : null}
      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-48 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <FilterDropdown
            label="Status"
            value={statusFilter}
            options={["Active", "Inactive", "All"]}
            onChange={setStatusFilter}
            filled
          />
          <FilterDropdown
            label="Group"
            value={groupFilter}
            options={groupOptions}
            onChange={setGroupFilter}
          />
        </div>
        <div className="flex items-center gap-3">
          {canManageTeam && selectedMembers.length > 0 && (
            <button
              onClick={() => requestDelete(selectedMembers)}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedMembers.length})
            </button>
          )}
          {canAddTeamMember ? (
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={rolesLoading || liveOrgRoles.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Invite Member
            </button>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="border-t border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {canManageTeam ? (
                <th className="text-left py-3 pr-4 w-8">
                  <Checkbox
                    checked={
                      deletableSortedIds.length > 0 &&
                      deletableSortedIds.every((id) => selectedMembers.includes(id))
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
              ) : null}
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-muted-foreground"
                >
                  Name
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
              <th className="text-left py-3 px-4 w-32 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={canManageTeam ? 5 : 4}
                  className="py-10 px-4 text-center text-sm text-muted-foreground"
                >
                  {members.length === 0
                    ? "No team members yet."
                    : "No team members match these filters."}
                </td>
              </tr>
            ) : (
              sortedMembers.map((member) => (
              <tr key={member.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                {canManageTeam ? (
                  <td className="py-3 pr-4">
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleSelect(member.id)}
                    />
                  </td>
                ) : null}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                          {getInitials(member.name)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      {member.status === "inactive" ? (
                        <span className="shrink-0 px-1.5 py-0.5 text-[11px] font-medium rounded bg-muted text-muted-foreground border border-border">
                          Pending
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-muted-foreground">
                    {member.roleTitle ?? member.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{member.email}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {canManageTeam ? (
                      <>
                        {isPersistedMember(member) ? (
                          <button
                            onClick={() => setEditingMember(member)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Edit Member"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        ) : null}
                        {canDeleteMember(member) ? (
                          <button
                            onClick={() => requestDelete([member.id])}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          orgRoles={liveOrgRoles}
          rolesLoading={rolesLoading}
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInviteMember}
        />
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          orgRoles={liveOrgRoles}
          onClose={() => setEditingMember(null)}
          onSave={async (updatedMember) => {
            const saved = await updateMember(updatedMember)
            if (saved) setEditingMember(null)
          }}
        />
      )}

      {pendingDeleteIds.length > 0 ? (
        <ConfirmDeleteModal
          count={pendingDeleteIds.length}
          isDeleting={isDeleting}
          onClose={() => {
            if (!isDeleting) setPendingDeleteIds([])
          }}
          onConfirm={confirmPendingDelete}
        />
      ) : null}
    </div>
  )
}

// Edit Member Modal
function EditMemberModal({
  member,
  orgRoles,
  onClose,
  onSave
}: {
  member: FullTeamMember
  orgRoles: OrgRoleOption[]
  onClose: () => void
  onSave: (member: FullTeamMember) => void | Promise<void>
}) {
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email)
  const [phone, setPhone] = useState(member.phone)
  const [customRoleId, setCustomRoleId] = useState(
    member.customRoleId ?? orgRoles[0]?.id ?? ""
  )
  const [isSaving, setIsSaving] = useState(false)

  const selectedRole = orgRoles.find((r) => r.id === customRoleId)

  const handleSave = async () => {
    if (isSaving || !name.trim() || !email.trim() || !customRoleId) return
    setIsSaving(true)
    try {
      await onSave({
        ...member,
        name,
        email,
        phone,
        role: selectedRole?.title ?? member.roleTitle ?? member.role,
        roleTitle: selectedRole?.title ?? member.roleTitle ?? member.role,
        customRoleId,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Edit Team Member</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
            <select
              value={customRoleId}
              onChange={(e) => setCustomRoleId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {orgRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !email.trim() || !customRoleId || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Invite Member Modal
function InviteMemberModal({
  orgRoles,
  rolesLoading = false,
  onClose,
  onInvite,
}: {
  orgRoles: OrgRoleOption[]
  rolesLoading?: boolean
  onClose: () => void
  onInvite: (data: {
    name: string
    email: string
    customRoleId: string
    roleTitle: string
  }) => Promise<string | null> | string | null
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [customRoleId, setCustomRoleId] = useState(orgRoles[0]?.id ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  React.useEffect(() => {
    if (orgRoles.length === 0) {
      setCustomRoleId("")
      return
    }
    setCustomRoleId((current) =>
      orgRoles.some((r) => r.id === current) ? current : orgRoles[0].id
    )
  }, [orgRoles])

  const selectedRole = orgRoles.find((r) => r.id === customRoleId)

  const handleSendInvite = async () => {
    if (isSubmitting || !email.trim() || !name.trim() || !customRoleId || !selectedRole) return
    setIsSubmitting(true)
    setInviteError(null)
    try {
      const error = await onInvite({
        name,
        email,
        customRoleId,
        roleTitle: selectedRole.title,
      })
      if (error) setInviteError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Invite Team Member</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
            {rolesLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading roles...
              </div>
            ) : orgRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">
                No roles available. Create a role first under the Roles tab.
              </p>
            ) : (
              <select
                value={customRoleId}
                onChange={(e) => setCustomRoleId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              >
                {orgRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            The member must sign up with this exact email address.
          </p>
          {inviteError ? (
            <p className="text-sm text-destructive">{inviteError}</p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvite}
            disabled={!email.trim() || !name.trim() || !customRoleId || isSubmitting || rolesLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding member...
              </>
            ) : (
              "Add Member"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDeleteModal({
  count,
  isDeleting,
  onClose,
  onConfirm,
}: {
  count: number
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Remove team member{count > 1 ? "s" : ""}</h2>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-muted-foreground">
            {count === 1
              ? "This member will be removed from the organization. This cannot be undone."
              : `${count} members will be removed from the organization. This cannot be undone.`}
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

const orgIndustryOptions = [
  "Design & Creative",
  "Technology",
  "Marketing",
  "Finance",
  "Healthcare",
  "Education",
]

const orgSizeOptions = ["1-10", "11-50", "51-200", "201-500", "500+"]

const orgCountryOptions = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
]

const orgStateOptionsByCountry: Record<string, string[]> = {
  India: [
    "Uttar Pradesh",
    "Maharashtra",
    "Karnataka",
    "Tamil Nadu",
    "Delhi",
    "Rajasthan",
    "Gujarat",
    "West Bengal",
    "Madhya Pradesh",
    "Kerala",
  ],
  "United States": [
    "California",
    "New York",
    "Texas",
    "Florida",
    "Illinois",
    "Washington",
    "Massachusetts",
    "Colorado",
  ],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
  Canada: ["Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba"],
  Australia: [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
  ],
}

function withCurrentOption(options: string[], current: string) {
  if (!current || options.includes(current)) return options
  return [current, ...options]
}

function OrganisationsTab({
  initialOrg,
  isOrgOwner,
}: {
  initialOrg?: OrgData | null
  isOrgOwner: boolean
}) {
  const router = useRouter()
  const [org, setOrg] = useState<OrgData | null>(initialOrg ?? null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLogoBusy, setIsLogoBusy] = useState(false)

  React.useEffect(() => {
    setOrg(initialOrg ?? null)
  }, [initialOrg])

  const canEdit = isOrgOwner && Boolean(org?.id)

  const persistOrg = async (patch: Partial<OrgData>) => {
    if (!org?.id || !canEdit) {
      const message = "You do not have permission to edit this organisation."
      setActionError(message)
      throw new Error(message)
    }

    const previous = org
    const next = { ...org, ...patch }
    setOrg(next)

    const dbPatch: Record<string, string | null> = {}
    if (patch.name !== undefined) dbPatch.name = patch.name
    if (patch.email !== undefined) dbPatch.email = patch.email
    if (patch.phone !== undefined) dbPatch.phone = patch.phone
    if (patch.website !== undefined) dbPatch.website = patch.website
    if (patch.industry !== undefined) dbPatch.industry = patch.industry
    if (patch.size !== undefined) dbPatch.size = patch.size
    if (patch.country !== undefined) dbPatch.country = patch.country
    if (patch.state !== undefined) dbPatch.state = patch.state
    if (patch.logo !== undefined) dbPatch.logo_url = patch.logo || null

    const supabase = createClient()
    const { error } = await supabase
      .from("organizations")
      .update(dbPatch)
      .eq("id", org.id)

    if (error) {
      setOrg(previous)
      setActionError(error.message)
      throw new Error(error.message)
    }

    setActionError(null)
    if (patch.name !== undefined || patch.logo !== undefined) {
      router.refresh()
    }
  }

  const savePatch = (patch: Partial<OrgData>) => {
    void persistOrg(patch).catch(() => {})
  }

  const handleLogoUpload = () => {
    if (!canEdit || !org?.id || isLogoBusy) return
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setIsLogoBusy(true)
      setActionError(null)
      try {
        const supabase = createClient()
        const ext = (file.name.split(".").pop() || "").replace(/[^A-Za-z0-9]+/g, "")
        const path = `org-logos/${org.id}/${Date.now()}-logo${ext ? `.${ext}` : ""}`
        const { error: uploadErr } = await supabase.storage
          .from("client-assets")
          .upload(path, file)
        if (uploadErr) {
          setActionError(uploadErr.message || "Logo upload failed.")
          return
        }
        const { data: urlData } = supabase.storage
          .from("client-assets")
          .getPublicUrl(path)
        await persistOrg({ logo: urlData.publicUrl })
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Logo upload failed.")
      } finally {
        setIsLogoBusy(false)
      }
    }
    input.click()
  }

  const handleLogoRemove = async () => {
    if (!canEdit || !org?.id || isLogoBusy || !org.logo) return
    setIsLogoBusy(true)
    try {
      await persistOrg({ logo: "" })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not remove logo.")
    } finally {
      setIsLogoBusy(false)
    }
  }

  const handleCountryChange = (country: string) => {
    const states = orgStateOptionsByCountry[country] ?? []
    const nextState = states.includes(org?.state ?? "") ? org?.state ?? "" : ""
    savePatch({ country, state: nextState })
  }

  if (!org?.id) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Organisation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organisation details
          </p>
        </div>
        <div className="border border-dashed border-border rounded-xl p-10 text-center">
          <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No organisation yet. Create one to manage its details here.
          </p>
        </div>
      </div>
    )
  }

  const stateOptions = withCurrentOption(
    orgStateOptionsByCountry[org.country] ?? [],
    org.state
  )
  const countryOptions = withCurrentOption(orgCountryOptions, org.country)
  const industryOptions = withCurrentOption(orgIndustryOptions, org.industry)
  const sizeOptions = withCurrentOption(orgSizeOptions, org.size)

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Organisation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {canEdit
            ? "Manage your organisation details"
            : "Organisation details. Only the owner can make changes."}
        </p>
      </div>

      {actionError ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      ) : null}

      <SectionHeader title="Organisation Logo" />
      <div className="border-t border-border">
        <div className="flex items-center justify-between py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {org.logo ? (
                <img src={org.logo} alt={org.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Building2 className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {canEdit ? "Upload your organisation logo" : "Organisation logo"}
            </p>
          </div>
          {canEdit ? (
            <div className="flex items-center gap-3">
              {org.logo ? (
                <button
                  onClick={() => void handleLogoRemove()}
                  disabled={isLogoBusy}
                  className="text-sm text-destructive hover:text-destructive/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              ) : null}
              <button
                onClick={handleLogoUpload}
                disabled={isLogoBusy}
                className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-muted-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLogoBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Upload"
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <SectionHeader title="Organisation Information" icon={<Building2 className="w-4 h-4 text-muted-foreground" />} />
      <div className="border-t border-border">
        <EditableRow
          label="Organisation Name"
          value={org.name}
          canEdit={canEdit}
          onSave={(v) => persistOrg({ name: v })}
        />
        <EditableRow
          label="Email Address"
          value={org.email}
          canEdit={canEdit}
          type="email"
          onSave={(v) => persistOrg({ email: v })}
        />
        <EditableRow
          label="Phone Number"
          value={org.phone}
          canEdit={canEdit}
          type="tel"
          onSave={(v) => persistOrg({ phone: v })}
        />
        <EditableRow
          label="Website"
          value={org.website}
          canEdit={canEdit}
          onSave={(v) => persistOrg({ website: v })}
        />
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-foreground">Industry</span>
          <Dropdown
            value={org.industry}
            options={industryOptions}
            disabled={!canEdit}
            onChange={(v) => savePatch({ industry: v })}
          />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-foreground">Organisation Size</span>
          <Dropdown
            value={org.size}
            options={sizeOptions}
            disabled={!canEdit}
            onChange={(v) => savePatch({ size: v })}
          />
        </div>
      </div>

      <SectionHeader title="Location" icon={<MapPin className="w-4 h-4 text-muted-foreground" />} />
      <div className="border-t border-border">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-foreground">Country</span>
          <Dropdown
            value={org.country}
            options={countryOptions}
            disabled={!canEdit}
            onChange={handleCountryChange}
          />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-foreground">State</span>
          <Dropdown
            value={org.state}
            options={stateOptions.length > 0 ? stateOptions : ["—"]}
            disabled={!canEdit || stateOptions.length === 0}
            onChange={(v) => savePatch({ state: v })}
          />
        </div>
      </div>
    </div>
  )
}

// Filter Dropdown Component
function FilterDropdown({
  label,
  value,
  options,
  onChange,
  filled = false
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  filled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
          filled
            ? "bg-foreground text-background"
            : "border border-border bg-background text-foreground hover:bg-muted"
        )}
      >
        {label}: {value}
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-[160px] bg-card border border-border rounded-lg shadow-lg z-10 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              className={cn(
                "w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                value === option && "text-[#5C6ECD] font-medium"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// More Dropdown Component
function MoreDropdown({ onDelete }: { onDelete?: () => void }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-foreground hover:bg-muted rounded transition-colors"
      >
        More
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[140px] bg-card border border-border rounded-lg shadow-lg z-10 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <button className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors">
            Edit
          </button>
          <button className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors">
            Duplicate
          </button>
          {onDelete && (
            <button
              onClick={() => {
                onDelete()
                setOpen(false)
              }}
              className="w-full px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Toggle Component
function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "w-9 h-5 rounded-full transition-colors relative",
        checked ? "bg-[#5C6ECD]" : "bg-muted-foreground/30"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

// Checkbox Component
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
        checked
          ? "bg-[#5C6ECD] border-[#5C6ECD]"
          : "border-muted-foreground/50 hover:border-muted-foreground"
      )}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
    </button>
  )
}

// Dropdown Component
function Dropdown({
  value,
  options,
  onChange,
  disabled = false,
  wide = false,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  disabled?: boolean
  wide?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(value)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setSelected(value)
  }, [value])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          if (!disabled) setOpen(!open)
        }}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-background text-sm text-foreground transition-colors",
          disabled
            ? "opacity-70 cursor-default"
            : "hover:bg-muted/50"
        )}
      >
        {selected || "—"}
        {!disabled ? (
          <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
        ) : null}
      </button>
      {open && !disabled && (
        <div className={cn(
          "absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 py-1 animate-in fade-in slide-in-from-top-2 duration-150",
          wide ? "min-w-[220px]" : "min-w-[180px]"
        )}>
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                setSelected(option)
                onChange(option)
                setOpen(false)
              }}
              className={cn(
                "w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors",
                selected === option && "text-[#5C6ECD] font-medium"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

