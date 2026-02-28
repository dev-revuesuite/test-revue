"use client"

import { FolderOpen, MessageSquare, CalendarDays, Users, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"

interface TeamMember {
  avatar: string
  name: string
}

interface Client {
  id: string
  name: string
  logoUrl?: string
  createdOn: string
  activeProjects: number
  interactionDate: string
  feedbackDate: string
  team: TeamMember[]
  additionalMembers: number
}

interface ClientCardProps {
  client: Client
}

export function ClientCard({ client }: ClientCardProps) {
  const router = useRouter()

  return (
    <div className="group rounded-xl border border-black/10 dark:border-white/10 bg-card p-5 flex flex-col hover:border-[#5C6ECD]/60 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-white/5 transition-all duration-300 hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {client.logoUrl ? (
            <img src={client.logoUrl} alt={client.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#4A5BC7] flex items-center justify-center">
              <span className="text-white font-bold text-xs">{client.name.substring(0, 2).toUpperCase()}</span>
            </div>
          )}
          <h3 className="font-bold text-[#4A5BC7] dark:text-[#7B8AE0] text-lg">
            {client.name}
          </h3>
        </div>
        <span className="text-[11px] text-foreground/60 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 font-medium">
          {client.createdOn}
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-2.5 mb-4 flex-1">
        <div className="flex items-center justify-between text-sm py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-2 transition-colors">
          <div className="flex items-center gap-2.5 text-foreground/70">
            <FolderOpen className="w-4 h-4 text-foreground/80 dark:text-foreground/70" />
            <span>Active Projects</span>
          </div>
          <span className="font-bold text-foreground">{client.activeProjects}</span>
        </div>

        <div className="flex items-center justify-between text-sm py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-2 transition-colors">
          <div className="flex items-center gap-2.5 text-foreground/70">
            <CalendarDays className="w-4 h-4 text-foreground/80 dark:text-foreground/70" />
            <span>Interaction Date</span>
          </div>
          <span className="font-bold text-foreground">{client.interactionDate}</span>
        </div>

        <div className="flex items-center justify-between text-sm py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-2 transition-colors">
          <div className="flex items-center gap-2.5 text-foreground/70">
            <MessageSquare className="w-4 h-4 text-foreground/80 dark:text-foreground/70" />
            <span>Feedback</span>
          </div>
          <span className="font-bold text-foreground">{client.feedbackDate}</span>
        </div>

        <div className="flex items-center justify-between text-sm py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 -mx-2 px-2 transition-colors">
          <div className="flex items-center gap-2.5 text-foreground/70">
            <Users className="w-4 h-4 text-foreground/80 dark:text-foreground/70" />
            <span>Team</span>
          </div>
          <div className="flex items-center -space-x-2">
            {client.team.slice(0, 4).map((member, index) => (
              <Avatar key={index} className="w-7 h-7 border-2 border-card ring-0 hover:scale-110 hover:z-10 transition-transform shadow-sm">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="text-[10px] bg-[#4A5BC7] text-white font-semibold">
                  {member.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
            {client.additionalMembers > 0 && (
              <div className="w-7 h-7 rounded-full bg-[#C8E946] text-black text-[10px] font-bold flex items-center justify-center border-2 border-card shadow-sm">
                +{client.additionalMembers}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <Button
        variant="outline"
        className="group w-full h-10 rounded-lg border-black/20 dark:border-white/20 hover:bg-black hover:text-white hover:border-black dark:hover:bg-white dark:hover:text-black dark:hover:border-white transition-all duration-300 font-semibold text-sm"
        onClick={() => router.push(`/room?client=${client.id}`)}
      >
        VIEW PROJECTS
        <ArrowRight className="w-4 h-4 btn-arrow" />
      </Button>
    </div>
  )
}
