"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LayoutGrid, Folder, Wrench, Users, Moon, Sun, LogOut, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const navItems = [
  {
    title: "Room",
    url: "/room",
    icon: User,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutGrid,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: Folder,
  },
  {
    title: "Revue Tool",
    url: "/revue-tool",
    icon: Wrench,
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
  const [activeItem, setActiveItem] = React.useState(navItems[0].title)
  const [isDark, setIsDark] = React.useState(false)

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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="flex flex-col h-svh w-16 border-r bg-background">
      {/* Navigation Items */}
      <nav className="flex flex-col items-center gap-2 py-4 flex-1">
        {navItems.map((item) => (
          <button
            key={item.title}
            onClick={() => {
              setActiveItem(item.title)
              router.push(item.url)
            }}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
              activeItem === item.title
                ? "bg-[#334AC0] text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={item.title}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-2 py-4">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
