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
  Maximize,
  Minimize,
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

interface OrgMember {
  id: string
  name: string
  email: string
  avatar: string
  role: string
}

interface StudioHeaderProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  organizationId: string | null
  organizationLogoUrl?: string | null
  clientDirectory: { id: string; name: string; logoUrl?: string }[]
  teamMembers?: OrgMember[]
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

export function StudioHeader({
  user,
  organizationId,
  organizationLogoUrl,
  clientDirectory,
  teamMembers = [],
}: StudioHeaderProps) {
  const router = useRouter()
  const [notificationDialogOpen, setNotificationDialogOpen] = React.useState(false)
  const [messageDialogOpen, setMessageDialogOpen] = React.useState(false)
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
  const [inviteRole, setInviteRole] = React.useState("member")
  const [linkCopied, setLinkCopied] = React.useState(false)

  // Theme state
  const [isDark, setIsDark] = React.useState(false)

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  // New client dialog state
  const [newClientDialogOpen, setNewClientDialogOpen] = React.useState(false)
  // New brief dialog state
  const [newBriefDialogOpen, setNewBriefDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  // Listen for custom event to open Add Client dialog
  React.useEffect(() => {
    const handler = () => setNewClientDialogOpen(true)
    window.addEventListener("revue:open-add-client", handler)
    return () => window.removeEventListener("revue:open-add-client", handler)
  }, [])

  // Listen for custom event to open Add Brief/Project dialog
  React.useEffect(() => {
    const handler = () => setNewBriefDialogOpen(true)
    window.addEventListener("revue:open-add-brief", handler)
    return () => window.removeEventListener("revue:open-add-brief", handler)
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

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://revue.app/invite/abc123")
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleSendInvites = () => {
    console.log("Sending invites:", { emails: inviteEmails, role: inviteRole })
    setInviteModalOpen(false)
    setInviteEmails([])
    setInviteEmail("")
  }

  const ensureClientId = async (clientName: string) => {
    if (!organizationId || !clientName.trim()) return null

    const existing = clientDirectory.find((client) => client.name === clientName)
    if (existing) return existing.id

    const supabase = createClient()
    const { data, error } = await supabase
      .from("clients")
      .insert({ organization_id: organizationId, name: clientName })
      .select("id")
      .single()

    if (error) {
      console.error("Failed to create client:", error)
      return null
    }

    return data?.id ?? null
  }

  return (
    <header className="flex items-center h-16 px-5 border-b border-[#e6e6e6] dark:border-[#333] bg-white dark:bg-[#1a1a1a]">
      {/* Left section - Logo */}
      <div className="flex items-center h-full">
        {/* Logo - aligned with sidebar width */}
        <div className="relative flex items-center justify-center w-16 h-full -ml-5">
          <img src="/Logo/Artboard 6@2x.png" alt="Revue" width={28} height={28} className="dark:hidden" />
          <img src="/Logo/Artboard 5@2x.png" alt="Revue" width={28} height={28} className="hidden dark:block" />
          <div className="absolute right-0 top-1/2 h-6 w-px -translate-y-1/2 bg-[#e6e6e6] dark:bg-[#333]" />
        </div>
        {/* Organisation Logo */}
        <div className="ml-3 flex items-center">
          <img
            src={
              organizationLogoUrl ||
              "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg"
            }
            alt="Organization logo"
            className="h-6 w-[72px] object-contain"
          />
        </div>
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

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize className="w-5 h-5 text-[#1a1a1a] dark:text-white" />
          ) : (
            <Maximize className="w-5 h-5 text-[#1a1a1a] dark:text-white" />
          )}
        </button>

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
        onComplete={async (data) => {
          const name = data.brandName?.trim() || "Untitled Client"
          if (!organizationId) {
            console.error("Organization is required to create a client.")
            setNewClientDialogOpen(false)
            return
          }

          const supabase = createClient()

          // Upload logo to storage if provided
          let logoUrl: string | null = null
          if (data.logo) {
            const ext = data.logo.name.split(".").pop()
            const path = `${organizationId}/${Date.now()}-logo.${ext}`
            const { error: uploadErr } = await supabase.storage
              .from("client-assets")
              .upload(path, data.logo)
            if (!uploadErr) {
              const { data: urlData } = supabase.storage
                .from("client-assets")
                .getPublicUrl(path)
              logoUrl = urlData.publicUrl
            }
          }

          // Upload brand images to storage and collect URLs
          const brandImageUrls: string[] = []
          for (const imageDataUrl of data.brandImages) {
            const res = await fetch(imageDataUrl)
            const blob = await res.blob()
            const ext = blob.type.split("/").pop() || "png"
            const path = `${organizationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
            const { error: imgErr } = await supabase.storage
              .from("client-assets")
              .upload(path, blob)
            if (!imgErr) {
              const { data: imgUrl } = supabase.storage
                .from("client-assets")
                .getPublicUrl(path)
              brandImageUrls.push(imgUrl.publicUrl)
            }
          }

          // Upload custom fonts and build full fonts array
          const fontsJson = data.fontRows
            .filter((f) => f.font.trim())
            .map((f) => ({ label: f.label, font_name: f.font, font_url: null as string | null }))

          for (const customFont of data.customFonts) {
            const path = `${organizationId}/${Date.now()}-${customFont.name}`
            const { error: fontErr } = await supabase.storage
              .from("client-assets")
              .upload(path, customFont.file)
            if (!fontErr) {
              const { data: fontUrl } = supabase.storage
                .from("client-assets")
                .getPublicUrl(path)
              fontsJson.push({
                label: customFont.name,
                font_name: customFont.name,
                font_url: fontUrl.publicUrl,
              })
            }
          }

          // Insert client — single row with all data
          const { error } = await supabase.from("clients").insert({
            organization_id: organizationId,
            name,
            industry: data.industry || null,
            website_url: data.websiteUrl || null,
            office_address: data.officeAddress || null,
            contact_address: data.sameAsOffice
              ? data.officeAddress || null
              : data.contactAddress || null,
            logo_url: logoUrl,
            contacts: data.contacts
              .filter((c) => c.name.trim() || c.email.trim())
              .map((c) => ({
                name: c.name.trim(),
                email: c.email.trim() || null,
                country_code: c.countryCode,
                phone: c.phone.trim() || null,
              })),
            social_links: data.socialLinks
              .filter((s) => s.url.trim())
              .map((s) => ({ platform: s.platform, url: s.url.trim() })),
            fonts: fontsJson,
            colors: data.colorRows
              .filter((c) => c.hex.trim())
              .map((c) => ({
                hex: c.hex,
                font_label: c.font || null,
                name: c.name || null,
              })),
            brand_image_urls: brandImageUrls,
          })

          if (error) {
            console.error("Failed to create client:", error)
            return
          }

          setNewClientDialogOpen(false)
          router.refresh()
        }}
      />

      {/* New Brief Dialog */}
      <NewBriefDialog
        open={newBriefDialogOpen}
        onClose={() => setNewBriefDialogOpen(false)}
        clientDirectory={clientDirectory}
        teamMembers={teamMembers}
        onComplete={async (data) => {
          const projectName = data.projectName?.trim() || "Untitled Project"
          const clientName = data.clientName?.trim()

          if (!organizationId) {
            console.error("Organization is required to create a project.")
            setNewBriefDialogOpen(false)
            return
          }

          const clientId = clientName ? await ensureClientId(clientName) : null
          if (!clientId) return

          const supabase = createClient()

          // Upload reference files to storage
          const referencesJson = []
          for (const ref of data.references.filter(r => r.type === "file")) {
            if (!ref.name.trim() && !ref.file) continue
            let fileUrl: string | null = null
            if (ref.file) {
              const ext = ref.file.name.split(".").pop()
              const path = `${organizationId}/${clientId}/refs/${Date.now()}-${ref.file.name}`
              const { error: refErr } = await supabase.storage
                .from("client-assets")
                .upload(path, ref.file)
              if (!refErr) {
                const { data: refUrl } = supabase.storage
                  .from("client-assets")
                  .getPublicUrl(path)
                fileUrl = refUrl.publicUrl
              }
            }
            referencesJson.push({
              name: ref.name.trim(),
              file_url: fileUrl,
            })
          }

          const { error } = await supabase.from("projects").insert({
            client_id: clientId,
            name: projectName,
            description: data.description || null,
            project_type: data.projectType || null,
            start_date: data.startDate || null,
            end_date: data.endDate || null,
            end_time: null,
            account_manager: data.accountManager || null,
            auto_delete_iteration: data.autoDeleteIteration || "30 Days",
            need_qc_tool: data.needQCTool,
            workmode: data.workmode,
            other_description: data.otherDescription || null,
            deliverable_stages: data.deliverableStages
              .filter((s) => s.description.trim() || s.date)
              .map((s) => ({
                stage: s.stage,
                description: s.description.trim(),
                date: s.date || null,
              })),
            project_deliverables: data.deliverableStages
              .filter((s) => s.description.trim())
              .map((s) => ({
                id: `d${Math.random().toString(36).slice(2)}`,
                name: s.description.trim(),
                status: "pending",
                dueDate: s.date || null,
              })),
            team_roles: data.teamRoles
              .filter((r) => r.name.trim())
              .map((r) => ({ name: r.name.trim(), role: r.role })),
            references_data: referencesJson,
            external_links: data.references
              .filter((r) => r.type === "link" && r.name.trim())
              .map((r) => ({ name: r.name.trim() })),
            naming_columns: data.namingColumns.map((c) => c.value),
          })

          if (error) {
            console.error("Failed to create project:", error)
            return
          }

          setNewBriefDialogOpen(false)
          router.refresh()
        }}
      />

    </header>
  )
}
