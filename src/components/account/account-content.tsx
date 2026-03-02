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
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

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
}

type TabType = "profile" | "settings" | "team" | "organisations" | "roles"

// mockTeamMembers removed — now uses real data from props

const mockRoles = [
  { id: "1", name: "Team admin", description: "Full access to all features and settings", members: 2, permissions: ["manage_team", "manage_billing", "manage_roles", "edit_content", "view_content"] },
  { id: "2", name: "Editor", description: "Can edit and publish content", members: 5, permissions: ["edit_content", "view_content"] },
  { id: "3", name: "Viewer", description: "Can only view content", members: 12, permissions: ["view_content"] },
  { id: "4", name: "Member", description: "Standard team member access", members: 8, permissions: ["edit_content", "view_content"] },
]

// mockOrganisations removed — now uses real data from props

const allPermissions = [
  { id: "manage_team", label: "Manage Team", description: "Add, remove and manage team members" },
  { id: "manage_billing", label: "Manage Billing", description: "Access billing and subscription settings" },
  { id: "manage_roles", label: "Manage Roles", description: "Create and edit roles" },
  { id: "edit_content", label: "Edit Content", description: "Create and edit projects and files" },
  { id: "view_content", label: "View Content", description: "View projects and files" },
  { id: "delete_content", label: "Delete Content", description: "Delete projects and files" },
  { id: "manage_clients", label: "Manage Clients", description: "Add and manage clients" },
  { id: "export_data", label: "Export Data", description: "Export data and reports" },
]

export function AccountContent({ user, defaultTab = "profile", organization, teamMembers = [], profileData, organizationId }: AccountContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab)

  const tabs: { id: TabType; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "settings", label: "Settings" },
    { id: "team", label: "Team" },
    { id: "organisations", label: "Organisations" },
    { id: "roles", label: "Manage Roles" },
  ]

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
                onClick={() => setActiveTab(tab.id)}
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
          {activeTab === "team" && <TeamTab initialMembers={teamMembers} organizationId={organizationId ?? null} />}
          {activeTab === "organisations" && <OrganisationsTab initialOrg={organization} />}
          {activeTab === "roles" && <RolesTab />}
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
  type = "text"
}: {
  label: string
  value: string
  onSave: (value: string) => void
  type?: "text" | "email" | "tel"
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
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
              className="px-3 py-1.5 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <button onClick={handleSave} className="text-sm text-[#5C6ECD] font-medium">Save</button>
            <button onClick={handleCancel} className="text-sm text-muted-foreground font-medium">Cancel</button>
          </div>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">{value}</span>
            <button onClick={() => setIsEditing(true)} className="text-sm text-foreground hover:text-muted-foreground font-medium">
              Edit
            </button>
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

  const updateProfileField = async (field: string, value: string) => {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    const dbField = field === "fullName" ? "full_name" : field === "designation" ? "job_title" : field
    await supabase.from("profiles").update({ [dbField]: value }).eq("id", currentUser.id)
  }

  const handleAvatarUpload = async () => {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const ext = file.name.split(".").pop()
      const path = `${currentUser.id}/${Date.now()}-avatar.${ext}`
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file)
      if (uploadErr) {
        console.error("Avatar upload failed:", uploadErr)
        return
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      const newUrl = urlData.publicUrl
      await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", currentUser.id)
      setAvatarUrl(newUrl)
    }
    input.click()
  }

  const handleDeleteAvatar = async () => {
    const supabase = createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", currentUser.id)
    setAvatarUrl("")
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
            <button onClick={handleAvatarUpload} className="text-sm text-foreground hover:text-muted-foreground font-medium">Edit</button>
            <button onClick={handleDeleteAvatar} className="text-sm text-foreground hover:text-muted-foreground font-medium">Delete</button>
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
function SettingsTab({ initialPreferences }: { initialPreferences?: Record<string, unknown> }) {
  const [settings, setSettings] = useState({
    appearance: (initialPreferences?.appearance as string) || "System",
    timezone: (initialPreferences?.timezone as string) || "(GMT +05:30) India Standard Time",
    emailNotifications: initialPreferences?.emailNotifications !== false,
    pushNotifications: initialPreferences?.pushNotifications !== false,
  })

  const persistPreferences = async (updated: typeof settings) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("profiles").update({
      preferences: {
        appearance: updated.appearance,
        timezone: updated.timezone,
        emailNotifications: updated.emailNotifications,
        pushNotifications: updated.pushNotifications,
      }
    }).eq("id", user.id)
  }

  const updateSetting = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    persistPreferences(updated)
  }

  return (
    <div className="w-full">
      {/* Preferences */}
      <SectionHeader title="Preferences" icon={<Settings className="w-4 h-4 text-muted-foreground" />} />
      <div className="border-t border-border">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-foreground">Appearance</span>
          <Dropdown
            value={settings.appearance}
            options={["System", "Light", "Dark"]}
            onChange={(v) => updateSetting("appearance", v)}
          />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <span className="text-sm text-foreground">Timezone</span>
          <Dropdown
            value={settings.timezone}
            options={["(GMT +05:30) India Standard Time", "(GMT +00:00) UTC", "(GMT -05:00) Eastern Time", "(GMT -08:00) Pacific Time"]}
            onChange={(v) => updateSetting("timezone", v)}
          />
        </div>
      </div>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <div className="border-t border-border">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <span className="text-sm text-foreground">Email notifications</span>
            <p className="text-xs text-muted-foreground mt-0.5">Receive email updates about activity</p>
          </div>
          <Toggle checked={settings.emailNotifications} onChange={(v) => updateSetting("emailNotifications", v)} />
        </div>
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <span className="text-sm text-foreground">Push notifications</span>
            <p className="text-xs text-muted-foreground mt-0.5">Receive push notifications on your devices</p>
          </div>
          <Toggle checked={settings.pushNotifications} onChange={(v) => updateSetting("pushNotifications", v)} />
        </div>
      </div>

      {/* Security */}
      <SectionHeader title="Security" icon={<Shield className="w-4 h-4 text-muted-foreground" />} />
      <div className="border-t border-border">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <span className="text-sm text-foreground">Two-factor authentication</span>
            <p className="text-xs text-muted-foreground mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <button className="text-sm text-foreground hover:text-muted-foreground font-medium">Set up</button>
        </div>
      </div>
    </div>
  )
}

// Team Tab - Matching the reference design
type FullTeamMember = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  designation: string
  avatar: string
  status: string
  organisations: string[]
  stats: { qcMistake: { current: number; total: number }; avgTime: { current: number; total: number }; feedback: { current: number; total: number } }
  mostBriefFrom: string
  mostCommonIssue: string
  workingOn: { client: string; projects: string[] }[]
}

function toFullMember(m: TeamMemberData): FullTeamMember {
  return {
    ...m,
    designation: "",
    status: "active",
    organisations: [],
    stats: { qcMistake: { current: 0, total: 0 }, avgTime: { current: 0, total: 0 }, feedback: { current: 0, total: 0 } },
    mostBriefFrom: "",
    mostCommonIssue: "",
    workingOn: [],
  }
}

function TeamTab({ initialMembers = [], organizationId }: { initialMembers?: TeamMemberData[]; organizationId: string | null }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("Active")
  const [groupFilter, setGroupFilter] = useState("All")
  const [members, setMembers] = useState<FullTeamMember[]>(initialMembers.map(toFullMember))
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [performanceMember, setPerformanceMember] = useState<FullTeamMember | null>(null)
  const [editingMember, setEditingMember] = useState<FullTeamMember | null>(null)

  const roleOptions = ["Team admin", "Editor", "Viewer", "Member"]

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "All" ||
      (statusFilter === "Active" && member.status === "active") ||
      (statusFilter === "Inactive" && member.status === "inactive")
    return matchesSearch && matchesStatus
  })

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sortOrder === "asc") return a.name.localeCompare(b.name)
    return b.name.localeCompare(a.name)
  })

  const toggleSelectAll = () => {
    if (selectedMembers.length === sortedMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(sortedMembers.map(m => m.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id))
    } else {
      setSelectedMembers([...selectedMembers, id])
    }
  }

  const updateMemberRole = async (id: string, newRole: string) => {
    setMembers(members.map(m => m.id === id ? { ...m, role: newRole } : m))
    const supabase = createClient()
    await supabase.from("organization_members").update({ role: newRole }).eq("id", id)
  }

  const deleteMember = async (id: string) => {
    setMembers(members.filter(m => m.id !== id))
    setSelectedMembers(selectedMembers.filter(m => m !== id))
    const supabase = createClient()
    await supabase.from("organization_members").delete().eq("id", id)
  }

  const bulkDeleteMembers = async (ids: string[]) => {
    setMembers(members.filter(m => !ids.includes(m.id)))
    setSelectedMembers([])
    const supabase = createClient()
    await supabase.from("organization_members").delete().in("id", ids)
  }

  const updateMember = async (updatedMember: FullTeamMember) => {
    setMembers(members.map(m => m.id === updatedMember.id ? updatedMember : m))
    const supabase = createClient()
    await supabase.from("organization_members").update({
      name: updatedMember.name,
      email: updatedMember.email,
      phone: updatedMember.phone,
      role: updatedMember.role,
    }).eq("id", updatedMember.id)
  }

  const handleInviteMember = async (data: { name: string; email: string; designation: string; role: string }) => {
    if (!organizationId) return
    const supabase = createClient()
    const { data: inserted, error } = await supabase.from("organization_members").insert({
      organization_id: organizationId,
      name: data.name,
      email: data.email,
      phone: "",
      role: data.role,
    }).select().single()
    if (error || !inserted) {
      console.error("Failed to invite member:", error)
      return
    }
    const newMember = toFullMember({
      id: inserted.id,
      name: inserted.name || "",
      email: inserted.email || "",
      phone: inserted.phone || "",
      role: inserted.role || "Member",
      avatar: inserted.avatar_url || "",
    })
    setMembers([...members, newMember])
    setShowInviteModal(false)
  }

  return (
    <div className="w-full">
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
            options={["All", "Admins", "Editors", "Viewers"]}
            onChange={setGroupFilter}
          />
        </div>
        <div className="flex items-center gap-3">
          {selectedMembers.length > 0 && (
            <button
              onClick={() => bulkDeleteMembers(selectedMembers)}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedMembers.length})
            </button>
          )}
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border-t border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 pr-4 w-8">
                <Checkbox
                  checked={selectedMembers.length === sortedMembers.length && sortedMembers.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
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
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Organisations</th>
              <th className="text-left py-3 px-4 w-32 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => (
              <tr key={member.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4">
                  <Checkbox
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => toggleSelect(member.id)}
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted overflow-hidden">
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Dropdown
                    value={member.role}
                    options={roleOptions}
                    onChange={(newRole) => updateMemberRole(member.id, newRole)}
                  />
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{member.email}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {member.organisations.slice(0, 2).map((org, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded border border-border">
                        {org}
                      </span>
                    ))}
                    {member.organisations.length > 2 && (
                      <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded border border-border">
                        +{member.organisations.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPerformanceMember(member)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="View Performance"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingMember(member)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      title="Edit Member"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMember(member.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal onClose={() => setShowInviteModal(false)} onInvite={handleInviteMember} />
      )}

      {/* Performance Modal */}
      {performanceMember && (
        <PerformanceModal
          member={performanceMember}
          onClose={() => setPerformanceMember(null)}
          onDelete={async () => {
            await deleteMember(performanceMember.id)
            setPerformanceMember(null)
          }}
        />
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={async (updatedMember) => {
            await updateMember(updatedMember)
            setEditingMember(null)
          }}
        />
      )}
    </div>
  )
}

// Edit Member Modal
function EditMemberModal({
  member,
  onClose,
  onSave
}: {
  member: FullTeamMember
  onClose: () => void
  onSave: (member: FullTeamMember) => void
}) {
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email)
  const [phone, setPhone] = useState(member.phone)
  const [designation, setDesignation] = useState(member.designation)
  const [role, setRole] = useState(member.role)
  const [organisations, setOrganisations] = useState(member.organisations.join(", "))

  const handleSave = () => {
    onSave({
      ...member,
      name,
      email,
      phone,
      designation,
      role,
      organisations: organisations.split(",").map(i => i.trim()).filter(Boolean)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Edit Team Member</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
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
            <label className="block text-sm font-medium text-foreground mb-1.5">Designation</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Graphic Designer"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
            <Dropdown
              value={role}
              options={["Team admin", "Editor", "Viewer", "Member"]}
              onChange={setRole}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Organisations</label>
            <input
              type="text"
              value={organisations}
              onChange={(e) => setOrganisations(e.target.value)}
              placeholder="e.g. Revue Studios, Design Labs"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">Separate multiple organisations with commas</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !email.trim()}
            className="px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Invite Member Modal
function InviteMemberModal({ onClose, onInvite }: { onClose: () => void; onInvite: (data: { name: string; email: string; designation: string; role: string }) => void }) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [designation, setDesignation] = useState("")
  const [role, setRole] = useState("Member")

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Invite Team Member</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
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
            <label className="block text-sm font-medium text-foreground mb-1.5">Designation</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Graphic Designer"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
            <Dropdown
              value={role}
              options={["Team admin", "Editor", "Viewer", "Member"]}
              onChange={setRole}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onInvite({ name, email, designation, role })}
            disabled={!email.trim() || !name.trim()}
            className="px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Invite
          </button>
        </div>
      </div>
    </div>
  )
}

// Performance Modal
function PerformanceModal({
  member,
  onClose,
  onDelete
}: {
  member: FullTeamMember
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted overflow-hidden">
              <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-base font-semibold text-foreground">{member.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                <span>{member.designation}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{member.phone}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDelete}
              className="text-sm text-destructive hover:text-destructive/80 font-medium"
            >
              REMOVE
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Organisation Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {member.organisations.map((org, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 text-sm bg-background border border-border rounded-full text-foreground"
              >
                {org}
              </span>
            ))}
          </div>

          {/* Brief & Issue Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <span className="text-muted-foreground">Most brief from :</span>
              <a href="#" className="ml-2 text-[#5C6ECD] hover:underline">{member.mostBriefFrom}</a>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">Most common QC issue :</span>
              <span className="ml-2 text-foreground">{member.mostCommonIssue}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="flex items-end justify-center gap-1 mb-2">
                <div className="w-12 bg-muted rounded-t-lg relative overflow-hidden" style={{ height: '80px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[#5C6ECD] rounded-t-lg"
                    style={{ height: `${(member.stats.qcMistake.current / member.stats.qcMistake.total) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {member.stats.qcMistake.current}/{member.stats.qcMistake.total}
              </p>
              <p className="text-xs text-muted-foreground">Average QC Mistake<br />per Iteration</p>
            </div>
            <div className="text-center">
              <div className="flex items-end justify-center gap-1 mb-2">
                <div className="w-12 bg-muted rounded-t-lg relative overflow-hidden" style={{ height: '80px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[#5C6ECD] rounded-t-lg flex items-center justify-center"
                    style={{ height: `${(member.stats.avgTime.current / member.stats.avgTime.total) * 100}%` }}
                  >
                    <span className="text-white text-xs font-medium">{member.stats.avgTime.current}m</span>
                  </div>
                </div>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {member.stats.avgTime.current}m/{member.stats.avgTime.total}
              </p>
              <p className="text-xs text-muted-foreground">Average Time for<br />per feedback</p>
            </div>
            <div className="text-center">
              <div className="flex items-end justify-center gap-1 mb-2">
                <div className="w-12 bg-muted rounded-t-lg relative overflow-hidden" style={{ height: '80px' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[#5C6ECD] rounded-t-lg"
                    style={{ height: `${(member.stats.feedback.current / member.stats.feedback.total) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {member.stats.feedback.current}/{member.stats.feedback.total}
              </p>
              <p className="text-xs text-muted-foreground">Average feedback<br />received</p>
            </div>
          </div>

          {/* Working On */}
          <div>
            <h3 className="text-sm font-semibold text-[#5C6ECD] mb-3">Working on :</h3>
            <div className="border border-border rounded-lg divide-y divide-border">
              {member.workingOn.map((work, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium text-foreground">{work.client}</span>
                  <span className="text-sm text-muted-foreground text-right">
                    {work.projects.join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Organisations Tab
function OrganisationsTab({ initialOrg }: { initialOrg?: OrgData | null }) {
  const [org, setOrg] = useState(initialOrg || {
    id: "",
    name: "",
    email: "",
    phone: "",
    website: "",
    industry: "Design & Creative",
    size: "1-10",
    country: "India",
    state: "",
    logo: ""
  })

  const updateOrg = async (field: string, value: string) => {
    setOrg({ ...org, [field]: value })
    if (!org.id) return
    const supabase = createClient()
    const dbField = field === "logo" ? "logo_url" : field
    await supabase.from("organizations").update({ [dbField]: value }).eq("id", org.id)
  }

  const handleLogoUpload = async () => {
    if (!org.id) return
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const supabase = createClient()
      const ext = file.name.split(".").pop()
      const path = `${org.id}/${Date.now()}-logo.${ext}`
      const { error: uploadErr } = await supabase.storage.from("org-logos").upload(path, file)
      if (uploadErr) {
        console.error("Logo upload failed:", uploadErr)
        return
      }
      const { data: urlData } = supabase.storage.from("org-logos").getPublicUrl(path)
      const logoUrl = urlData.publicUrl
      await supabase.from("organizations").update({ logo_url: logoUrl }).eq("id", org.id)
      setOrg({ ...org, logo: logoUrl })
    }
    input.click()
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Organisation</h2>
          <p className="text-sm text-muted-foreground">Manage your organisation details</p>
        </div>
      </div>

      {/* Organisation Details */}
      <div>
        {/* Organisation Logo */}
        <SectionHeader title="Organisation Logo" />
        <div className="border-t border-border">
          <div className="flex items-center justify-between py-4 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                {org.logo ? (
                  <img src={org.logo} alt={org.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upload your organisation logo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleLogoUpload} className="text-sm text-foreground hover:text-muted-foreground font-medium">Upload</button>
            </div>
          </div>
        </div>

        {/* Organisation Information */}
        <SectionHeader title="Organisation Information" icon={<Building2 className="w-4 h-4 text-muted-foreground" />} />
        <div className="border-t border-border">
          <EditableRow label="Organisation Name" value={org.name} onSave={(v) => updateOrg("name", v)} />
          <EditableRow label="Email Address" value={org.email} onSave={(v) => updateOrg("email", v)} type="email" />
          <EditableRow label="Phone Number" value={org.phone} onSave={(v) => updateOrg("phone", v)} type="tel" />
          <EditableRow label="Website" value={org.website} onSave={(v) => updateOrg("website", v)} />
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-foreground">Industry</span>
            <Dropdown
              value={org.industry}
              options={["Design & Creative", "Technology", "Marketing", "Finance", "Healthcare", "Education"]}
              onChange={(v) => updateOrg("industry", v)}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-foreground">Organisation Size</span>
            <Dropdown
              value={org.size}
              options={["1-10", "11-50", "51-200", "201-500", "500+"]}
              onChange={(v) => updateOrg("size", v)}
            />
          </div>
        </div>

        {/* Location */}
        <SectionHeader title="Location" icon={<MapPin className="w-4 h-4 text-muted-foreground" />} />
        <div className="border-t border-border">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-foreground">Country</span>
            <Dropdown
              value={org.country}
              options={["India", "United States", "United Kingdom", "Canada", "Australia"]}
              onChange={(v) => updateOrg("country", v)}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-sm text-foreground">State</span>
            <Dropdown
              value={org.state}
              options={["Uttar Pradesh", "Maharashtra", "Karnataka", "Tamil Nadu", "Delhi", "London"]}
              onChange={(v) => updateOrg("state", v)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Roles Tab - Similar design to Team
function RolesTab() {
  const [roles, setRoles] = useState(mockRoles)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedRoles = [...filteredRoles].sort((a, b) => {
    if (sortOrder === "asc") return a.name.localeCompare(b.name)
    return b.name.localeCompare(a.name)
  })

  const toggleSelectAll = () => {
    if (selectedRoles.length === sortedRoles.length) {
      setSelectedRoles([])
    } else {
      setSelectedRoles(sortedRoles.map(r => r.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedRoles.includes(id)) {
      setSelectedRoles(selectedRoles.filter(r => r !== id))
    } else {
      setSelectedRoles([...selectedRoles, id])
    }
  }

  const handleCreateRole = (newRole: { name: string; description: string; permissions: string[] }) => {
    const role = {
      id: String(roles.length + 1),
      ...newRole,
      members: 0
    }
    setRoles([...roles, role])
    setShowCreateModal(false)
  }

  const deleteRole = (id: string) => {
    setRoles(roles.filter(r => r.id !== id))
  }

  return (
    <div className="w-full">
      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by:</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-48 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      {/* Table */}
      <div className="border-t border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 pr-4 w-8">
                <Checkbox
                  checked={selectedRoles.length === sortedRoles.length && sortedRoles.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-muted-foreground"
                >
                  Role Name
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Members</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Permissions</th>
              <th className="text-left py-3 px-4 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRoles.map((role) => (
              <tr key={role.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4">
                  <Checkbox
                    checked={selectedRoles.includes(role.id)}
                    onChange={() => toggleSelect(role.id)}
                  />
                </td>
                <td className="py-3 px-4">
                  <p className="text-sm font-medium text-foreground">{role.name}</p>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">{role.description}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{role.members} members</td>
                <td className="py-3 px-4">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-sm hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                    Manage access
                  </button>
                </td>
                <td className="py-3 px-4">
                  <MoreDropdown onDelete={() => deleteRole(role.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRole}
        />
      )}
    </div>
  )
}

// Create Role Modal
function CreateRoleModal({
  onClose,
  onCreate
}: {
  onClose: () => void
  onCreate: (role: { name: string; description: string; permissions: string[] }) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const togglePermission = (id: string) => {
    if (selectedPermissions.includes(id)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== id))
    } else {
      setSelectedPermissions([...selectedPermissions, id])
    }
  }

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate({ name, description, permissions: selectedPermissions })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Create Role</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter role title"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter role description"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Access Levels / Permissions</label>
            <div className="space-y-2">
              {allPermissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    checked={selectedPermissions.includes(permission.id)}
                    onChange={() => togglePermission(permission.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{permission.label}</p>
                    <p className="text-xs text-muted-foreground">{permission.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-2 bg-[#DBFE52] text-black rounded-lg text-sm font-medium hover:bg-[#c9ec48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Role
          </button>
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
  onChange
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(value)
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
        className="flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-background text-sm text-foreground hover:bg-muted/50 transition-colors"
      >
        {selected}
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[180px] bg-card border border-border rounded-lg shadow-lg z-10 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
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

