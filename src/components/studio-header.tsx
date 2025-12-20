"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  MessageSquare,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Search,
  Users,
  HelpCircle,
  CreditCard,
  Building2,
  UserPlus,
  FolderOpen,
  Image,
  FileText,
  Clock,
  ArrowRight,
  Command,
  Mail,
  Check,
  X,
  Copy,
  Link2,
  Shield,
  Contrast,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NewClientOnboarding } from "@/components/studio/new-client-onboarding"
import { NewBriefDialog } from "@/components/studio/new-brief-dialog"
import { NewOrganizationDialog } from "@/components/studio/new-organization-dialog"

const organizations = [
  { id: "1", name: "Acme Studio", abbr: "AS" },
  { id: "2", name: "Design Co", abbr: "DC" },
  { id: "3", name: "Creative Labs", abbr: "CL" },
]

const notifications = [
  {
    id: 1,
    title: "New comment on your post",
    description: "John Doe commented on your recent post",
    time: "2 min ago",
    read: false,
  },
  {
    id: 2,
    title: "Project update",
    description: "The project 'Dashboard' has been updated",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    title: "New team member",
    description: "Sarah joined your team",
    time: "3 hours ago",
    read: true,
  },
]

const messages = [
  {
    id: 1,
    sender: "Alice Smith",
    message: "Hey, can you review the design?",
    time: "5 min ago",
    read: false,
  },
  {
    id: 2,
    sender: "Bob Johnson",
    message: "Meeting at 3 PM today",
    time: "1 hour ago",
    read: false,
  },
]

interface StudioHeaderProps {
  user: {
    name: string
    email: string
    avatar: string
  }
}

const searchPlaceholders = [
  "Search Projects...",
  "Search Clients...",
  "Search Assets...",
  "Search Team...",
]

const searchCategories = [
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "clients", label: "Clients", icon: Users },
  { id: "assets", label: "Assets", icon: Image },
  { id: "team", label: "Team Members", icon: UserPlus },
]

const recentSearches = [
  { type: "project", name: "Website Redesign", icon: FolderOpen },
  { type: "client", name: "TechVision Labs", icon: Building2 },
  { type: "asset", name: "Brand Guidelines.pdf", icon: FileText },
]

export function StudioHeader({ user }: StudioHeaderProps) {
  const router = useRouter()
  const [notificationDialogOpen, setNotificationDialogOpen] = React.useState(false)
  const [messageDialogOpen, setMessageDialogOpen] = React.useState(false)
  const [selectedOrg, setSelectedOrg] = React.useState(organizations[0])
  const [searchValue, setSearchValue] = React.useState("")
  const [searchModalOpen, setSearchModalOpen] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState("projects")
  const [placeholderIndex, setPlaceholderIndex] = React.useState(0)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteEmails, setInviteEmails] = React.useState<string[]>([])
  const [selectedOrgs, setSelectedOrgs] = React.useState<string[]>([organizations[0].id])
  const [inviteRole, setInviteRole] = React.useState("member")
  const [linkCopied, setLinkCopied] = React.useState(false)

  // Theme state
  const [isDark, setIsDark] = React.useState(false)

  // New client dialog state
  const [newClientDialogOpen, setNewClientDialogOpen] = React.useState(false)
  // New brief dialog state
  const [newBriefDialogOpen, setNewBriefDialogOpen] = React.useState(false)
  // New organization dialog state
  const [newOrgDialogOpen, setNewOrgDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  // Animate placeholder text
  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length)
        setIsAnimating(false)
      }, 200)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Focus search input when modal opens
  React.useEffect(() => {
    if (searchModalOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [searchModalOpen])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const unreadNotifications = notifications.filter(n => !n.read).length
  const unreadMessages = messages.filter(m => !m.read).length

  // Invite modal functions
  const handleAddEmail = () => {
    if (inviteEmail && !inviteEmails.includes(inviteEmail) && inviteEmail.includes("@")) {
      setInviteEmails([...inviteEmails, inviteEmail])
      setInviteEmail("")
    }
  }

  const handleRemoveEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email))
  }

  const handleToggleOrg = (orgId: string) => {
    if (selectedOrgs.includes(orgId)) {
      if (selectedOrgs.length > 1) {
        setSelectedOrgs(selectedOrgs.filter(id => id !== orgId))
      }
    } else {
      setSelectedOrgs([...selectedOrgs, orgId])
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://revue.app/invite/abc123")
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleSendInvites = () => {
    console.log("Sending invites:", { emails: inviteEmails, orgs: selectedOrgs, role: inviteRole })
    setInviteModalOpen(false)
    setInviteEmails([])
    setInviteEmail("")
  }

  return (
    <header className="flex items-center h-16 px-5 border-b border-[#e6e6e6] dark:border-[#333] bg-white dark:bg-[#1a1a1a]">
      {/* Left section - Logo and Org Switcher */}
      <div className="flex items-center h-full">
        {/* Logo - aligned with sidebar width */}
        <div className="flex items-center justify-center w-16 h-full -ml-5">
          <svg width="20" height="30" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
            <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
            <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
            <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
            <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
          </svg>
        </div>

        {/* Organization Switcher - Miro style */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2.5 h-full px-4 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors">
              <div className="w-7 h-7 rounded bg-[#5C6ECD] flex items-center justify-center">
                <span className="text-white font-semibold text-xs">{selectedOrg.abbr}</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-[#1a1a1a] dark:text-white leading-tight">{selectedOrg.name}</p>
                <p className="text-xs text-[#7a7a7a] dark:text-[#999] leading-tight">{selectedOrg.name}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-[#7a7a7a] dark:text-[#999] ml-1" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-1.5" align="start" sideOffset={4}>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org)}
                className={cn(
                  "w-full flex items-center gap-3 px-2.5 py-2 rounded text-sm transition-colors",
                  selectedOrg.id === org.id
                    ? "bg-[#f0f0f0] dark:bg-[#333]"
                    : "hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]"
                )}
              >
                <div className="w-7 h-7 rounded bg-[#5C6ECD] flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">{org.abbr}</span>
                </div>
                <span className="text-[#1a1a1a] dark:text-white font-medium">{org.name}</span>
              </button>
            ))}
            <div className="border-t border-[#e6e6e6] dark:border-[#333] mt-1.5 pt-1.5">
              <button
                onClick={() => setNewOrgDialogOpen(true)}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded text-sm text-[#7a7a7a] dark:text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create new organization</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 ml-auto pr-5">
        {/* Search Bar - Animated placeholder (aligned right) */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="relative flex items-center w-72 h-10 px-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded-lg hover:bg-[#ebebeb] dark:hover:bg-[#333] transition-colors cursor-text"
        >
          <Search className="w-4 h-4 text-[#7a7a7a] dark:text-[#999] mr-2.5 shrink-0" />
          <span
            className={cn(
              "text-sm text-[#7a7a7a] dark:text-[#999] transition-all duration-200 overflow-hidden whitespace-nowrap",
              isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}
          >
            {searchPlaceholders[placeholderIndex]}
          </span>
          <div className="ml-auto flex items-center gap-1 text-[10px] text-[#999] dark:text-[#666]">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] rounded border border-[#e0e0e0] dark:border-[#444] font-medium">
              <Command className="w-3 h-3 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1a1a1a] rounded border border-[#e0e0e0] dark:border-[#444] font-medium">
              K
            </kbd>
          </div>
        </button>

        {/* Invite Members Button - Miro style */}
        <Button
          variant="outline"
          onClick={() => setInviteModalOpen(true)}
          className="h-10 px-4 gap-2 text-sm font-medium border-[#d9d9d9] dark:border-[#444] text-[#1a1a1a] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] hover:border-[#bbb] dark:hover:border-[#555] rounded-lg"
        >
          <UserPlus className="w-4 h-4" />
          Invite Members
        </Button>

        {/* Add New Dropdown - Client/Project/Creative */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-10 px-4 gap-2 text-sm font-medium bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add New
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-48 p-1.5">
            <DropdownMenuItem
              onClick={() => setNewClientDialogOpen(true)}
              className="gap-3 py-2.5 px-3 text-sm cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded-lg"
            >
              <Users className="w-4 h-4 text-[#5C6ECD]" />
              <span className="font-medium">Add Client</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setNewBriefDialogOpen(true)}
              className="gap-3 py-2.5 px-3 text-sm cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded-lg"
            >
              <FolderOpen className="w-4 h-4 text-[#10b981]" />
              <span className="font-medium">Add Brief</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 py-2.5 px-3 text-sm cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded-lg">
              <Image className="w-4 h-4 text-[#f59e0b]" />
              <span className="font-medium">Add Creative</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Messages Icon */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors">
              <MessageSquare className="w-5 h-5 text-[#1a1a1a] dark:text-white" />
              {unreadMessages > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-[#f24822] text-white text-[10px] flex items-center justify-center font-medium px-1">
                  {unreadMessages}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
            <div className="p-3 border-b border-[#e6e6e6] dark:border-[#333]">
              <h4 className="font-semibold text-sm text-[#1a1a1a] dark:text-white">Messages</h4>
            </div>
            <div className="max-h-64 overflow-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "p-3 border-b border-[#e6e6e6] dark:border-[#333] last:border-0 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] cursor-pointer",
                  !msg.read && "bg-[#f0f7ff] dark:bg-[#1a2a3a]"
                )}>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#5C6ECD] text-white text-xs font-semibold">
                        {msg.sender.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a1a] dark:text-white truncate">{msg.sender}</p>
                      <p className="text-xs text-[#7a7a7a] dark:text-[#999] truncate">{msg.message}</p>
                    </div>
                    <span className="text-[10px] text-[#7a7a7a] dark:text-[#999] whitespace-nowrap">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-[#e6e6e6] dark:border-[#333]">
              <Button variant="ghost" className="w-full text-xs h-8 text-[#5C6ECD] hover:text-[#5C6ECD] hover:bg-[#f0f7ff] dark:hover:bg-[#1a2a3a]" onClick={() => setMessageDialogOpen(true)}>
                View all messages
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Notifications Icon */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors">
              <Bell className="w-5 h-5 text-[#1a1a1a] dark:text-white" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full bg-[#f24822] text-white text-[10px] flex items-center justify-center font-medium px-1">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
            <div className="p-3 border-b border-[#e6e6e6] dark:border-[#333]">
              <h4 className="font-semibold text-sm text-[#1a1a1a] dark:text-white">Notifications</h4>
            </div>
            <div className="max-h-64 overflow-auto">
              {notifications.map((notif) => (
                <div key={notif.id} className={cn(
                  "p-3 border-b border-[#e6e6e6] dark:border-[#333] last:border-0 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] cursor-pointer",
                  !notif.read && "bg-[#f0f7ff] dark:bg-[#1a2a3a]"
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      !notif.read ? "bg-[#5C6ECD]" : "bg-transparent"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a1a] dark:text-white">{notif.title}</p>
                      <p className="text-xs text-[#7a7a7a] dark:text-[#999] truncate">{notif.description}</p>
                      <span className="text-[10px] text-[#7a7a7a] dark:text-[#999]">{notif.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-[#e6e6e6] dark:border-[#333]">
              <Button variant="ghost" className="w-full text-xs h-8 text-[#5C6ECD] hover:text-[#5C6ECD] hover:bg-[#f0f7ff] dark:hover:bg-[#1a2a3a]" onClick={() => setNotificationDialogOpen(true)}>
                View all notifications
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Avatar with Dropdown - Miro style */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center ml-1">
              <Avatar className="h-10 w-10 ring-2 ring-[#e6e6e6] dark:ring-[#444] hover:ring-[#5C6ECD] transition-all">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-[#ff7eb3] text-white text-sm font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 p-1.5" align="end" sideOffset={8}>
            {/* User Info Header */}
            <div className="flex items-center gap-3 px-2 py-2.5 mb-1">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-[#ff7eb3] text-white font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[#1a1a1a] dark:text-white">{user.name}</span>
              </div>
            </div>
            <DropdownMenuSeparator className="bg-[#e6e6e6] dark:bg-[#333]" />
            {/* Account Tabs */}
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push("/account?tab=profile")}
                className="gap-3 py-2 px-2 text-sm text-[#1a1a1a] dark:text-white cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded"
              >
                <User className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/account?tab=settings")}
                className="gap-3 py-2 px-2 text-sm text-[#1a1a1a] dark:text-white cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded"
              >
                <Settings className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/account?tab=team")}
                className="gap-3 py-2 px-2 text-sm text-[#1a1a1a] dark:text-white cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded"
              >
                <Users className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                Team
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/account?tab=organisations")}
                className="gap-3 py-2 px-2 text-sm text-[#1a1a1a] dark:text-white cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded"
              >
                <Building2 className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                Organisations
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/account?tab=billing")}
                className="gap-3 py-2 px-2 text-sm text-[#1a1a1a] dark:text-white cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded"
              >
                <CreditCard className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/account?tab=roles")}
                className="gap-3 py-2 px-2 text-sm text-[#1a1a1a] dark:text-white cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded"
              >
                <Shield className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                Manage Roles
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-[#e6e6e6] dark:bg-[#333]" />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={toggleTheme}
                className="gap-3 py-2 px-2 text-sm text-[#1a1a1a] dark:text-white cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded"
              >
                <Contrast className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                {isDark ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 py-2 px-2 text-sm text-[#1a1a1a] dark:text-white cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded">
                <HelpCircle className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                Learning Center
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-[#e6e6e6] dark:bg-[#333]" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="gap-3 py-2 px-2 text-sm text-[#1a1a1a] dark:text-white cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] rounded"
            >
              <LogOut className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Messages</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto -mx-6 px-6">
            {messages.map((msg) => (
              <div key={msg.id} className={cn(
                "p-3 border-b last:border-0 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] cursor-pointer rounded-lg",
                !msg.read && "bg-[#f0f7ff] dark:bg-[#1a2a3a]"
              )}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#5C6ECD] text-white text-sm font-semibold">
                      {msg.sender.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{msg.sender}</p>
                      <span className="text-[10px] text-[#7a7a7a] dark:text-[#999]">{msg.time}</span>
                    </div>
                    <p className="text-sm text-[#7a7a7a] dark:text-[#999] mt-1">{msg.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto -mx-6 px-6">
            {notifications.map((notif) => (
              <div key={notif.id} className={cn(
                "p-3 border-b last:border-0 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] cursor-pointer rounded-lg",
                !notif.read && "bg-[#f0f7ff] dark:bg-[#1a2a3a]"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                    !notif.read ? "bg-[#5C6ECD]" : "bg-[#d9d9d9] dark:bg-[#444]"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <span className="text-[10px] text-[#7a7a7a] dark:text-[#999]">{notif.time}</span>
                    </div>
                    <p className="text-sm text-[#7a7a7a] dark:text-[#999] mt-1">{notif.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Modal */}
      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent className="max-w-3xl w-[80vw] p-0 gap-0 overflow-hidden rounded-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">Search for projects, clients, assets, and team members</DialogDescription>
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#e6e6e6] dark:border-[#333]">
            <Search className="w-5 h-5 text-[#7a7a7a] dark:text-[#999] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Type to search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-[#7a7a7a] dark:placeholder:text-[#999] text-[#1a1a1a] dark:text-white"
            />
            <kbd className="px-2 py-1 bg-[#f5f5f5] dark:bg-[#2a2a2a] rounded text-xs text-[#7a7a7a] dark:text-[#999] border border-[#e0e0e0] dark:border-[#444]">
              ESC
            </kbd>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-[#e6e6e6] dark:border-[#333] bg-[#fafafa] dark:bg-[#1a1a1a]">
            <span className="text-xs text-[#7a7a7a] dark:text-[#999] mr-2">Search in:</span>
            {searchCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  selectedCategory === category.id
                    ? "bg-[#5C6ECD] text-white"
                    : "text-[#7a7a7a] dark:text-[#999] hover:bg-[#e6e6e6] dark:hover:bg-[#333] hover:text-[#1a1a1a] dark:hover:text-white"
                )}
              >
                <category.icon className="w-3.5 h-3.5" />
                {category.label}
              </button>
            ))}
          </div>

          {/* Search Results / Recent Searches */}
          <div className="max-h-72 overflow-auto scrollbar-hide">
            {searchValue ? (
              // Search Results
              <div className="p-5">
                <div className="text-[10px] font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-3">
                  Results in {searchCategories.find(c => c.id === selectedCategory)?.label}
                </div>
                <div className="text-center py-10 text-[#7a7a7a] dark:text-[#999]">
                  <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No results found for "{searchValue}"</p>
                  <p className="text-xs mt-1 opacity-70">Try different keywords</p>
                </div>
              </div>
            ) : (
              // Recent Searches
              <div className="p-5">
                <div className="text-[10px] font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Clock className="w-3 h-3" />
                  Recent Searches
                </div>
                <div className="space-y-0.5">
                  {recentSearches.map((item, index) => (
                    <button
                      key={index}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#f0f0f0] dark:bg-[#333] flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-[#7a7a7a] dark:text-[#999]" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-[#1a1a1a] dark:text-white">{item.name}</p>
                        <p className="text-[11px] text-[#7a7a7a] dark:text-[#999] capitalize">{item.type}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#7a7a7a] dark:text-[#999] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Members Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="max-w-lg w-[90vw] p-0 gap-0 overflow-hidden rounded-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Invite Team Members</DialogTitle>
          <DialogDescription className="sr-only">Add people to collaborate on projects</DialogDescription>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e6] dark:border-[#333]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5C6ECD] flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a1a] dark:text-white">Invite Team Members</h2>
                <p className="text-xs text-[#7a7a7a] dark:text-[#999]">Add people to collaborate on projects</p>
              </div>
            </div>
            <button
              onClick={() => setInviteModalOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors"
            >
              <X className="w-4 h-4 text-[#7a7a7a]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Email Input */}
            <div>
              <label className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-2 block">
                Email Addresses
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7a7a]" />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#e6e6e6] dark:border-[#444] bg-white dark:bg-[#2a2a2a] text-sm outline-none focus:border-[#5C6ECD] dark:focus:border-[#5C6ECD] transition-colors placeholder:text-[#999]"
                  />
                </div>
                <Button
                  onClick={handleAddEmail}
                  className="h-10 px-4 bg-[#5C6ECD] hover:bg-[#4A5BC7] text-white rounded-lg"
                >
                  Add
                </Button>
              </div>
              {/* Email Tags */}
              {inviteEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {inviteEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f0f0f0] dark:bg-[#333] text-sm"
                    >
                      <span className="text-[#1a1a1a] dark:text-white">{email}</span>
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#ddd] dark:hover:bg-[#444] transition-colors"
                      >
                        <X className="w-3 h-3 text-[#7a7a7a]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Organization Selection */}
            <div>
              <label className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-2 block">
                Select Organizations
              </label>
              <div className="space-y-2">
                {organizations.map((org) => {
                  const isSelected = selectedOrgs.includes(org.id)
                  return (
                    <button
                      key={org.id}
                      onClick={() => handleToggleOrg(org.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                        isSelected
                          ? "border-[#5C6ECD] bg-[#5C6ECD]/5 dark:bg-[#5C6ECD]/10"
                          : "border-[#e6e6e6] dark:border-[#444] hover:border-[#bbb] dark:hover:border-[#555]"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-xs",
                        isSelected ? "bg-[#5C6ECD]" : "bg-[#7a7a7a]"
                      )}>
                        {org.abbr}
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-[#1a1a1a] dark:text-white">
                        {org.name}
                      </span>
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        isSelected
                          ? "border-[#5C6ECD] bg-[#5C6ECD]"
                          : "border-[#d9d9d9] dark:border-[#555]"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="text-xs font-semibold text-[#7a7a7a] dark:text-[#999] uppercase tracking-wider mb-2 block">
                Role
              </label>
              <div className="flex gap-2">
                {[
                  { id: "admin", label: "Admin", desc: "Full access" },
                  { id: "member", label: "Member", desc: "Can edit" },
                  { id: "viewer", label: "Viewer", desc: "View only" },
                ].map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setInviteRole(role.id)}
                    className={cn(
                      "flex-1 p-3 rounded-xl border transition-all text-center",
                      inviteRole === role.id
                        ? "border-[#5C6ECD] bg-[#5C6ECD]/5 dark:bg-[#5C6ECD]/10"
                        : "border-[#e6e6e6] dark:border-[#444] hover:border-[#bbb] dark:hover:border-[#555]"
                    )}
                  >
                    <p className={cn(
                      "text-sm font-medium",
                      inviteRole === role.id ? "text-[#5C6ECD]" : "text-[#1a1a1a] dark:text-white"
                    )}>
                      {role.label}
                    </p>
                    <p className="text-[10px] text-[#7a7a7a] dark:text-[#999] mt-0.5">{role.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Invite Link */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f5f5f5] dark:bg-[#2a2a2a]">
              <Link2 className="w-4 h-4 text-[#7a7a7a]" />
              <span className="flex-1 text-sm text-[#7a7a7a] dark:text-[#999] truncate">
                https://revue.app/invite/abc123
              </span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#333] border border-[#e6e6e6] dark:border-[#444] text-xs font-medium hover:bg-[#f0f0f0] dark:hover:bg-[#3a3a3a] transition-colors"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e6e6e6] dark:border-[#333] bg-[#fafafa] dark:bg-[#1a1a1a]">
            <Button
              variant="outline"
              onClick={() => setInviteModalOpen(false)}
              className="h-10 px-5 rounded-lg border-[#d9d9d9] dark:border-[#444] text-[#1a1a1a] dark:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvites}
              disabled={inviteEmails.length === 0}
              className="h-10 px-5 rounded-lg bg-[#DBFE52] hover:bg-[#c9eb4a] text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Invites
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Client Onboarding */}
      <NewClientOnboarding
        open={newClientDialogOpen}
        onClose={() => setNewClientDialogOpen(false)}
        onComplete={(data) => {
          console.log("New client data:", data)
          setNewClientDialogOpen(false)
        }}
      />

      {/* New Brief Dialog */}
      <NewBriefDialog
        open={newBriefDialogOpen}
        onClose={() => setNewBriefDialogOpen(false)}
        onComplete={(data) => {
          console.log("New brief data:", data)
          setNewBriefDialogOpen(false)
        }}
      />

      {/* New Organization Dialog */}
      <NewOrganizationDialog
        open={newOrgDialogOpen}
        onClose={() => setNewOrgDialogOpen(false)}
        onComplete={(data) => {
          console.log("New organization data:", data)
          setNewOrgDialogOpen(false)
        }}
      />
    </header>
  )
}
