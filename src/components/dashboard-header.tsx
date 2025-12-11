"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, MessageSquare, Bell, User, CreditCard, Settings, LogOut, Moon, Sun, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

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
  {
    id: 4,
    title: "Meeting reminder",
    description: "Team standup in 30 minutes",
    time: "5 hours ago",
    read: true,
  },
]

const messages = [
  {
    id: 1,
    sender: "Alice Smith",
    message: "Hey, can you review the design?",
    time: "5 min ago",
    avatar: "",
    read: false,
  },
  {
    id: 2,
    sender: "Bob Johnson",
    message: "Meeting at 3 PM today",
    time: "1 hour ago",
    avatar: "",
    read: false,
  },
]

interface DashboardHeaderProps {
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter()
  const [currentTime, setCurrentTime] = React.useState("")
  const [location, setLocation] = React.useState("Loading...")
  const [isDark, setIsDark] = React.useState(false)
  const [notificationDialogOpen, setNotificationDialogOpen] = React.useState(false)
  const [messageDialogOpen, setMessageDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours()
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      )
      // Set isDark based on time (6 PM to 6 AM is night)
      setIsDark(hours >= 18 || hours < 6)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  React.useEffect(() => {
    // Get location from IP
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.city && data.country_name) {
          setLocation(`${data.city}, ${data.country_name}`)
        } else {
          setLocation("Unknown location")
        }
      })
      .catch(() => {
        setLocation("Unknown location")
      })
  }, [])

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

  return (
    <header className="flex items-center justify-end h-16 px-6 border-b bg-background gap-4">
      {/* Add button */}
      <Button className="bg-[#334AC0] hover:bg-[#2a3da6] text-white gap-2 h-9">
        <Plus className="w-4 h-4" />
        Add
      </Button>

      {/* Messages */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="relative flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMessageDialogOpen(true)}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-[#334AC0] rounded-full text-white text-[10px] flex items-center justify-center font-medium px-1">
              {messages.filter(m => !m.read).length}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">Messages</h4>
          </div>
          <div className="max-h-64 overflow-auto">
            {messages.slice(0, 3).map((msg) => (
              <div key={msg.id} className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer ${!msg.read ? 'bg-muted/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#334AC0] text-white text-xs">
                      {msg.sender.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{msg.sender}</p>
                    <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full text-xs h-8" onClick={() => setMessageDialogOpen(true)}>
              View all messages
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Messages Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Messages</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto -mx-6 px-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer rounded-lg ${!msg.read ? 'bg-muted/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#334AC0] text-white text-sm">
                      {msg.sender.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{msg.sender}</p>
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{msg.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="relative flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setNotificationDialogOpen(true)}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-[#334AC0] rounded-full text-white text-[10px] flex items-center justify-center font-medium px-1">
              {notifications.filter(n => !n.read).length}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">Notifications</h4>
          </div>
          <div className="max-h-64 overflow-auto">
            {notifications.slice(0, 3).map((notif) => (
              <div key={notif.id} className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer ${!notif.read ? 'bg-muted/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${!notif.read ? 'bg-[#334AC0]' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{notif.description}</p>
                    <span className="text-[10px] text-muted-foreground">{notif.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full text-xs h-8" onClick={() => setNotificationDialogOpen(true)}>
              View all notifications
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Notifications Dialog */}
      <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto -mx-6 px-6">
            {notifications.map((notif) => (
              <div key={notif.id} className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer rounded-lg ${!notif.read ? 'bg-muted/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.read ? 'bg-[#334AC0]' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <span className="text-[10px] text-muted-foreground">{notif.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notif.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* User Menu */}
      <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} className="rounded-full" />
                <AvatarFallback className="bg-[#334AC0] text-white text-sm rounded-full">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-[#334AC0] text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      {/* Time and Location */}
      <div className="flex items-center gap-2 text-right">
        {isDark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
        <div>
          <p className="text-sm font-medium leading-tight">{currentTime}</p>
          <p className="text-xs text-muted-foreground leading-tight">{location}</p>
        </div>
      </div>
    </header>
  )
}
