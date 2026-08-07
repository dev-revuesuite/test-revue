"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  ChevronRight,
  Contrast,
  CreditCard,
  Download,
  HelpCircle,
  Loader2,
  LogOut,
  Settings,
  Shield,
  User,
  Users,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { appRoute, publicPath } from "@/lib/base-path"
import { createClient } from "@/lib/supabase/client"

export type QuickAnalysisDownloadMode = "original" | "with-ai-boxes"

interface QuickAnalysisHeaderProps {
  fileName: string
  onDownload: (mode: QuickAnalysisDownloadMode) => void | Promise<void>
  downloadDisabled?: boolean
  downloadWithAiBoxesDisabled?: boolean
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function QuickAnalysisHeader({
  fileName,
  onDownload,
  downloadDisabled = false,
  downloadWithAiBoxesDisabled = false,
  user,
}: QuickAnalysisHeaderProps) {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDark, setIsDark] = useState(false)

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  const handleDownload = async (mode: QuickAnalysisDownloadMode) => {
    if (downloadDisabled || isDownloading) return
    if (mode === "with-ai-boxes" && downloadWithAiBoxesDisabled) return

    setIsDownloading(true)
    try {
      await onDownload(mode)
    } finally {
      setIsDownloading(false)
    }
  }

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
    router.push(appRoute("/login"))
    router.refresh()
  }

  return (
    <>
      {/* Left floating pill */}
      <div className="absolute left-3 top-3 z-10">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-[#444] dark:bg-[#2a2a2a]">
          <Link
            href={appRoute("/quick-analysis")}
            className="transition-opacity hover:opacity-80"
            title="New analysis"
          >
            <img
              src={publicPath("/Logo/Artboard_2.png")}
              alt="Revue"
              width={28}
              height={28}
            />
          </Link>

          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />

          <Link
            href={appRoute("/quick-analysis")}
            className="flex items-center gap-1.5 transition-colors hover:opacity-90"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#DBFE52]/25">
              <Zap className="h-3.5 w-3.5 text-[#9ab83a]" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-white">
              Quick AI Analysis
            </span>
          </Link>

          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />

          <span className="max-w-[200px] truncate text-sm font-medium text-gray-800 dark:text-white sm:max-w-xs">
            {fileName}
          </span>
        </div>
      </div>

      {/* Right floating pill */}
      <div className="absolute right-3 top-3 z-10">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-[#444] dark:bg-[#2a2a2a]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={downloadDisabled || isDownloading}
                aria-label="Download"
                title="Download"
                className="h-9 w-9 border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-[#444] dark:text-gray-300 dark:hover:bg-[#333]"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-[#444] dark:bg-[#2a2a2a]"
            >
              <DropdownMenuItem
                disabled={downloadDisabled || isDownloading}
                onClick={() => handleDownload("original")}
                className="cursor-pointer rounded-md px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200"
              >
                Download original
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={
                  downloadDisabled ||
                  isDownloading ||
                  downloadWithAiBoxesDisabled
                }
                onClick={() => handleDownload("with-ai-boxes")}
                className="cursor-pointer rounded-md px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200"
              >
                Download with AI boxes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center justify-center">
                <Avatar className="h-9 w-9 ring-2 ring-gray-200 hover:ring-blue-500 dark:ring-[#444]">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-[#ff7eb3] text-sm font-semibold text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-56 border-gray-200 bg-white p-1.5 dark:border-[#444] dark:bg-[#2a2a2a]"
            >
              <div className="mb-1 flex items-center gap-3 px-2 py-2.5">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-[#ff7eb3] font-semibold text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-[#444]" />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => router.push(appRoute("/account?tab=profile"))}
                  className="cursor-pointer gap-3 rounded px-2 py-2 text-sm dark:text-white"
                >
                  <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(appRoute("/account?tab=settings"))}
                  className="cursor-pointer gap-3 rounded px-2 py-2 text-sm dark:text-white"
                >
                  <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(appRoute("/account?tab=team"))}
                  className="cursor-pointer gap-3 rounded px-2 py-2 text-sm dark:text-white"
                >
                  <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Team
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(appRoute("/account?tab=organisations"))
                  }
                  className="cursor-pointer gap-3 rounded px-2 py-2 text-sm dark:text-white"
                >
                  <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Organisations
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(appRoute("/account?tab=billing"))}
                  className="cursor-pointer gap-3 rounded px-2 py-2 text-sm dark:text-white"
                >
                  <CreditCard className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(appRoute("/account?tab=roles"))}
                  className="cursor-pointer gap-3 rounded px-2 py-2 text-sm dark:text-white"
                >
                  <Shield className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  Manage Roles
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-[#444]" />
              <DropdownMenuItem
                onClick={toggleTheme}
                className="cursor-pointer gap-3 rounded px-2 py-2 text-sm dark:text-white"
              >
                <Contrast className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                {isDark ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-3 rounded px-2 py-2 text-sm dark:text-white">
                <HelpCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                Learning Center
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-[#444]" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer gap-3 rounded px-2 py-2 text-sm text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  )
}
