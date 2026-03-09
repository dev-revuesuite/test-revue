"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { LayoutGrid, HardDrive, Palette, Briefcase, Settings, HelpCircle, PanelLeftClose, PanelLeft, Loader2, Sun, Moon, FolderOpen } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

type UserRole = "admin" | "designer" | "client"

const allNavItems = [
  {
    title: "Dashboard",
    url: "/studio",
    icon: LayoutGrid,
    roles: ["admin", "designer"] as UserRole[],
  },
  {
    title: "Projects",
    url: "/client-portal",
    icon: FolderOpen,
    roles: ["client"] as UserRole[],
  },
  {
    title: "Master Drive",
    url: "/master-drive",
    icon: HardDrive,
    roles: ["admin", "designer"] as UserRole[],
  },
  {
    title: "Creative Zone",
    url: "/creative-zone",
    icon: Palette,
    roles: ["admin", "designer"] as UserRole[],
  },
  {
    title: "Productive Zone",
    url: "/productive-zone",
    icon: Briefcase,
    roles: ["admin", "designer"] as UserRole[],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: ["admin", "designer", "client"] as UserRole[],
  },
  {
    title: "Help Desk",
    url: "/help-desk",
    icon: HelpCircle,
    roles: ["admin", "designer", "client"] as UserRole[],
  },
]

interface AppSidebarProps {
  user: {
    name: string
    email: string
    avatar: string
  }
  userRole?: UserRole
  clientId?: string | null
}

export function AppSidebar({ user, userRole = "admin", clientId }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [pendingUrl, setPendingUrl] = React.useState<string | null>(null)

  const navItems = allNavItems.filter((item) => item.roles.includes(userRole))

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleNavClick = (url: string) => {
    // Immediate visual feedback
    setPendingUrl(url)
    startTransition(() => {
      router.push(url)
    })
  }

  // Clear pending state when navigation completes
  React.useEffect(() => {
    if (!isPending) {
      setPendingUrl(null)
    }
  }, [isPending])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <aside className={cn(
      "flex flex-col h-full border-r border-border bg-background transition-all duration-300",
      isExpanded ? "w-52" : "w-16"
    )}>
      {/* Spacer to align with header logo area */}
      <div className="h-0" />

      {/* Navigation Items - Top */}
      <nav className="flex flex-col items-center gap-2 py-4 px-2">
        {navItems.map((item) => {
          // For client "Projects" tab, also highlight when on /room page
          const isActive = item.title === "Projects" && userRole === "client"
            ? pathname === "/client-portal" || pathname === "/room"
            : pathname === item.url || pathname.startsWith(item.url + "/")
          const isNavigating = pendingUrl === item.url

          return (
            <Link
              key={item.title}
              href={item.url}
              prefetch={true}
              onClick={(e) => {
                e.preventDefault()
                if (!isActive && !isNavigating) {
                  handleNavClick(item.url)
                }
              }}
              className={cn(
                "flex items-center gap-3 transition-all duration-150 relative rounded-lg",
                isExpanded ? "w-full px-3 py-3 justify-start" : "w-12 h-12 justify-center",
                isActive
                  ? "bg-[#DBFE52] text-black shadow-md"
                  : isNavigating
                  ? "bg-[#DBFE52]/30 text-[#9ab83a]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent active:scale-95"
              )}
              title={!isExpanded ? item.title : undefined}
            >
              {isNavigating ? (
                <Loader2 className="w-6 h-6 shrink-0 animate-spin" strokeWidth={1.5} />
              ) : (
                <item.icon className="w-6 h-6 shrink-0" strokeWidth={1.5} />
              )}
              {isExpanded && (
                <span className="text-sm font-medium">{item.title}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="mx-3 border-t border-border" />

      {/* Bottom Actions - Theme Toggle & Expand */}
      <div className="flex flex-col items-center gap-2 py-4 px-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 active:scale-95 rounded-lg",
            isExpanded ? "w-full px-3 py-3 justify-start" : "w-12 h-12 justify-center"
          )}
          title={mounted ? (theme === "dark" ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun className="w-6 h-6 shrink-0" strokeWidth={1.5} />
            ) : (
              <Moon className="w-6 h-6 shrink-0" strokeWidth={1.5} />
            )
          ) : (
            <Sun className="w-6 h-6 shrink-0" strokeWidth={1.5} />
          )}
          {isExpanded && (
            <span className="text-sm font-medium">
              {mounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : "Theme"}
            </span>
          )}
        </button>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 active:scale-95 rounded-lg",
            isExpanded ? "w-full px-3 py-3 justify-start" : "w-12 h-12 justify-center"
          )}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <>
              <PanelLeftClose className="w-6 h-6 shrink-0" strokeWidth={1.5} />
              <span className="text-sm font-medium">Collapse</span>
            </>
          ) : (
            <PanelLeft className="w-6 h-6" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </aside>
  )
}
