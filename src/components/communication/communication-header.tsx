"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ChevronRight,
  ChevronDown,
  Plus,
  History,
  Check,
  Pencil,
  User,
  Settings,
  Users,
  Building2,
  CreditCard,
  Shield,
  Contrast,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Iteration {
  id: string;
  name: string;
  version: number;
  timestamp: string;
}

interface CommunicationHeaderProps {
  iterations?: Iteration[];
  activeIterationId?: string;
  onIterationChange?: (id: string) => void;
  onNewIteration?: () => void;
  onShare?: () => void;
  clientId?: string;
  clientName?: string;
  clientLogo?: string;
  projectName?: string;
  creativeName?: string;
}

export function CommunicationHeader({
  iterations: propIterations,
  activeIterationId: propActiveId,
  onIterationChange,
  onNewIteration,
  onShare,
  clientId = "",
  clientName = "",
  clientLogo = "",
  projectName = "",
  creativeName: propCreativeName = "Creative",
}: CommunicationHeaderProps) {
  const router = useRouter();
  const [creativeName, setCreativeName] = useState(propCreativeName);
  const [isEditing, setIsEditing] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: "", email: "", avatar: "" });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          avatar: user.user_metadata?.avatar_url || "",
        });
      }
    });
  }, []);

  const iterations = propIterations || [];
  const activeIteration = propActiveId || iterations[0]?.id || "";

  const currentIteration = iterations.find((i) => i.id === activeIteration);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleIterationSelect = (id: string) => {
    if (onIterationChange) {
      onIterationChange(id);
    }
  };

  const handleNewIteration = () => {
    if (onNewIteration) {
      onNewIteration();
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    }
  };

  return (
    <>
      {/* Left Section - Floating */}
      <div className="absolute top-3 left-3 z-10">
        <div className="flex items-center gap-2 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-sm border border-gray-200 dark:border-[#444] px-4 py-2.5">
          {/* Revue Logo - Links to homepage */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <img src="/Logo/Artboard 5@2x.png" alt="Revue" width={28} height={28} />
          </Link>

          {/* Separator */}
          <ChevronRight className="w-4 h-4 text-gray-400" />

          {/* Client Logo + Name */}
          {clientName && (
            <>
              <div className="flex items-center gap-1.5">
                {clientLogo ? (
                  <img src={clientLogo} alt={clientName} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{clientName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{clientName}</span>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </>
          )}

          {/* Project Name - Links to room */}
          {projectName && (
            <>
              <Link
                href={`/room?client=${clientId}`}
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {projectName}
              </Link>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </>
          )}

          {/* Creative Name - Editable */}
          {isEditing ? (
            <Input
              value={creativeName}
              onChange={(e) => setCreativeName(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
              className="h-7 w-36 bg-gray-100 dark:bg-[#333] border-gray-300 dark:border-[#555] text-gray-800 dark:text-white text-sm px-2"
              autoFocus
            />
          ) : (
            <button
              className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-[#333] px-1.5 py-0.5 rounded transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {creativeName}
              <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </button>
          )}

        </div>
      </div>

      {/* Right Section - Floating */}
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center gap-3 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-sm border border-gray-200 dark:border-[#444] px-4 py-2.5">
          {/* Iterations Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#333] transition-colors">
                <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {currentIteration?.name || "No Iterations"}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] shadow-lg rounded-lg p-1"
            >
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Iterations</p>
              </div>
              {iterations.map((iteration) => (
                <DropdownMenuItem
                  key={iteration.id}
                  onClick={() => handleIterationSelect(iteration.id)}
                  className={cn(
                    "flex items-center justify-between py-2.5 px-3 cursor-pointer rounded-md mx-1",
                    activeIteration === iteration.id
                      ? "bg-blue-50 dark:bg-blue-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-[#333]"
                  )}
                >
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-sm font-medium",
                      activeIteration === iteration.id ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"
                    )}>
                      {iteration.name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{iteration.timestamp}</span>
                  </div>
                  {activeIteration === iteration.id && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New Iteration Button - only for users who can upload */}
          {onNewIteration && (
            <button
              onClick={handleNewIteration}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-sm transition-all bg-[#DBFE52] hover:bg-[#d0f043] text-black"
            >
              <Plus className="w-4 h-4" />
              New Iteration
            </button>
          )}

          {/* Download Button - Icon only */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-[#444] hover:bg-gray-50 dark:hover:bg-[#333]"
          >
            <Download className="w-4 h-4" />
          </Button>

          {/* Share Button */}
          <Button
            size="sm"
            onClick={handleShare}
            className="h-9 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium px-5 rounded-md"
          >
            Share
          </Button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 dark:bg-[#444]" />

          {/* User Avatar with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center">
                <Avatar className="h-9 w-9 ring-2 ring-gray-200 dark:ring-[#444] hover:ring-blue-500 transition-all cursor-pointer">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="bg-[#ff7eb3] text-white text-sm font-semibold">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-1.5 bg-white dark:bg-[#2a2a2a] border-gray-200 dark:border-[#444]" align="end" sideOffset={8}>
              {/* User Info Header */}
              <div className="flex items-center gap-3 px-2 py-2.5 mb-1">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="bg-[#ff7eb3] text-white font-semibold">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{currentUser.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</span>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-[#444]" />
              {/* Account Tabs */}
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => router.push("/account?tab=profile")}
                  className="gap-3 py-2 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] rounded dark:text-white"
                >
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/account?tab=settings")}
                  className="gap-3 py-2 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] rounded dark:text-white"
                >
                  <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/account?tab=team")}
                  className="gap-3 py-2 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] rounded dark:text-white"
                >
                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Team
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/account?tab=organisations")}
                  className="gap-3 py-2 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] rounded dark:text-white"
                >
                  <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Organisations
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/account?tab=billing")}
                  className="gap-3 py-2 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] rounded dark:text-white"
                >
                  <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/account?tab=roles")}
                  className="gap-3 py-2 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] rounded dark:text-white"
                >
                  <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Manage Roles
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-[#444]" />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={toggleTheme}
                  className="gap-3 py-2 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] rounded dark:text-white"
                >
                  <Contrast className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  {isDark ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 py-2 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] rounded dark:text-white">
                  <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Learning Center
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-[#444]" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-3 py-2 px-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333] rounded text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
