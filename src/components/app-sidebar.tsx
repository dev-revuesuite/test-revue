"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { LayoutGrid, FileText, FolderOpen, Plus, Users, LogOut, PanelLeftClose, PanelLeft, HardDrive } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const navItems = [
  {
    title: "Studio",
    url: "/studio",
    icon: LayoutGrid,
  },
  {
    title: "Master Drive",
    url: "/master-drive",
    icon: HardDrive,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FileText,
  },
  {
    title: "Revue Tool",
    url: "/revue-tool",
    icon: FolderOpen,
  },
  {
    title: "Create",
    url: "/create",
    icon: Plus,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
]

interface AppSidebarProps {
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = React.useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className={cn(
      "flex flex-col h-full border-r border-[#e6e6e6] dark:border-[#333] bg-white dark:bg-[#1a1a1a] transition-all duration-300",
      isExpanded ? "w-52" : "w-16"
    )}>
      {/* Navigation Items - Top */}
      <nav className="flex flex-col items-center gap-2 py-4 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
          return (
            <button
              key={item.title}
              onClick={() => router.push(item.url)}
              className={cn(
                "flex items-center gap-3 rounded-xl transition-all duration-200",
                isExpanded ? "w-full px-3 py-3 justify-start" : "w-12 h-12 justify-center",
                isActive
                  ? "bg-[#DBFE52] text-black shadow-md shadow-[#DBFE52]/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={!isExpanded ? item.title : undefined}
            >
              <item.icon className="w-6 h-6 shrink-0" strokeWidth={1.5} />
              {isExpanded && (
                <span className="text-sm font-medium">{item.title}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="mx-3 border-t border-border" />

      {/* Bottom Actions - Logout & Expand */}
      <div className="flex flex-col items-center gap-2 py-4 px-2">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200",
            isExpanded ? "w-full px-3 py-3 justify-start" : "w-12 h-12 justify-center"
          )}
          title="Logout"
        >
          <LogOut className="w-6 h-6 shrink-0" strokeWidth={1.5} />
          {isExpanded && (
            <span className="text-sm font-medium">Logout</span>
          )}
        </button>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200",
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
