"use client"

import { useState, useRef, useEffect } from "react"
import {
  Hash, Users, Search, Plus, Send, Paperclip, Image as ImageIcon,
  Smile, AtSign, MoreHorizontal, Pin, Phone, Video, Settings,
  ChevronDown, ChevronRight, FileText, Download, Eye, CheckCircle2,
  Clock, Reply, FolderOpen, Megaphone, Lock, PanelRightClose, PanelRight, AlertCircle, Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// Types
interface User {
  id: string
  name: string
  avatar?: string
  role: string
  status: "online" | "offline" | "away" | "dnd"
  isClient?: boolean
}

interface Reaction {
  emoji: string
  count: number
  users: string[]
}

interface Attachment {
  id: string
  name: string
  type: "image" | "file" | "design"
  url: string
  size?: string
}

interface Message {
  id: string
  userId: string
  content: string
  timestamp: string
  attachments?: Attachment[]
  reactions?: Reaction[]
  isPinned?: boolean
  isSystemMessage?: boolean
  designFeedback?: {
    creativeName: string
    iterationNumber: number
    status: "pending" | "approved" | "revision"
  }
}

interface Channel {
  id: string
  name: string
  type: "channel" | "dm" | "project"
  icon?: "hash" | "megaphone" | "lock" | "project"
  unreadCount?: number
  participants?: User[]
}

// Sample Data
const currentUser: User = {
  id: "u1",
  name: "Jacob Hawkins",
  avatar: "https://i.pravatar.cc/150?img=1",
  role: "Project Manager",
  status: "online"
}

const teamMembers: User[] = [
  { id: "u1", name: "Jacob Hawkins", avatar: "https://i.pravatar.cc/150?img=1", role: "Project Manager", status: "online" },
  { id: "u2", name: "Regina Cooper", avatar: "https://i.pravatar.cc/150?img=2", role: "Lead Designer", status: "online" },
  { id: "u3", name: "Jane Wilson", avatar: "https://i.pravatar.cc/150?img=3", role: "UI Designer", status: "away" },
  { id: "u4", name: "Ronald Robertson", avatar: "https://i.pravatar.cc/150?img=4", role: "Reviewer", status: "offline" },
  { id: "u5", name: "Dustin Williamson", avatar: "https://i.pravatar.cc/150?img=5", role: "Developer", status: "online" },
  { id: "u6", name: "Sarah Chen", avatar: "https://i.pravatar.cc/150?img=6", role: "Client", status: "online", isClient: true },
  { id: "u7", name: "Mike Johnson", avatar: "https://i.pravatar.cc/150?img=7", role: "Client", status: "offline", isClient: true },
]

const groups: Channel[] = [
  { id: "g1", name: "Design Team", type: "channel", icon: "hash", unreadCount: 3 },
  { id: "g2", name: "Project Alpha", type: "channel", icon: "hash", unreadCount: 5 },
  { id: "g3", name: "Client Reviews", type: "channel", icon: "lock" },
  { id: "g4", name: "Marketing", type: "channel", icon: "hash", unreadCount: 1 },
  { id: "g5", name: "Development", type: "channel", icon: "hash" },
]

const directMessages: Channel[] = [
  { id: "dm1", name: "Sarah Chen", type: "dm", participants: [teamMembers[5]], unreadCount: 2 },
  { id: "dm2", name: "Regina Cooper", type: "dm", participants: [teamMembers[1]] },
  { id: "dm3", name: "Mike Johnson", type: "dm", participants: [teamMembers[6]] },
  { id: "dm4", name: "Jacob Hawkins", type: "dm", participants: [teamMembers[0]], unreadCount: 1 },
  { id: "dm5", name: "Jane Wilson", type: "dm", participants: [teamMembers[2]] },
  { id: "dm6", name: "Ronald Robertson", type: "dm", participants: [teamMembers[3]] },
  { id: "dm7", name: "Dustin Williamson", type: "dm", participants: [teamMembers[4]] },
]

const sampleMessages: Message[] = [
  {
    id: "m1",
    userId: "u2",
    content: "Hey team! I've just uploaded the latest iteration for the WebUI Design project. Please review when you get a chance.",
    timestamp: "9:30 AM",
    designFeedback: { creativeName: "Hero Banner v3", iterationNumber: 3, status: "pending" }
  },
  {
    id: "m2",
    userId: "u6",
    content: "This looks amazing! Love the color scheme and the layout. Just one small suggestion - can we make the CTA button a bit more prominent?",
    timestamp: "9:45 AM",
    reactions: [{ emoji: "👍", count: 3, users: ["u1", "u2", "u3"] }]
  },
  {
    id: "m3",
    userId: "u1",
    content: "Great feedback Sarah! @Regina Cooper can you work on making the CTA more prominent?",
    timestamp: "9:52 AM",
  },
  {
    id: "m4",
    userId: "u2",
    content: "Sure! I'll increase the button size and add a subtle shadow. Should be ready in an hour.",
    timestamp: "9:55 AM",
    reactions: [{ emoji: "🙌", count: 2, users: ["u1", "u6"] }]
  },
  {
    id: "m5",
    userId: "u3",
    content: "I've also prepared the mobile responsive versions. Here are the preview files:",
    timestamp: "10:15 AM",
    attachments: [
      { id: "a1", name: "mobile-preview.png", type: "image", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400", size: "2.4 MB" },
      { id: "a2", name: "tablet-preview.png", type: "image", url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400", size: "1.8 MB" },
    ]
  },
  {
    id: "m6",
    userId: "u6",
    content: "Perfect! The responsive designs look great. I'm approving this iteration.",
    timestamp: "10:30 AM",
    designFeedback: { creativeName: "Hero Banner v3", iterationNumber: 3, status: "approved" },
    isPinned: true
  },
  {
    id: "m7",
    userId: "system",
    content: "Sarah Chen approved Hero Banner v3 - Iteration 3",
    timestamp: "10:30 AM",
    isSystemMessage: true
  },
  {
    id: "m8",
    userId: "u1",
    content: "Excellent work everyone! Let's move on to the next deliverable. @Jane Wilson can you share the progress on the dashboard components?",
    timestamp: "10:45 AM",
  },
]

// Status indicator
function StatusDot({ status }: { status: User["status"] }) {
  const colors = {
    online: "bg-emerald-500",
    offline: "bg-slate-400",
    away: "bg-amber-500",
    dnd: "bg-red-500"
  }
  return <span className={cn("w-2.5 h-2.5 rounded-full border-2 border-background", colors[status])} />
}

// Channel item
function ChannelItem({ channel, isActive, onClick }: { channel: Channel; isActive: boolean; onClick: () => void }) {
  const icons = {
    megaphone: Megaphone,
    lock: Lock,
    project: FolderOpen,
    hash: Hash
  }
  const Icon = icons[channel.icon || "hash"]

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
        isActive ? "bg-[#5C6ECD]/10 text-[#5C6ECD] font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("w-4 h-4", isActive && "text-[#5C6ECD]")} />
      <span className="flex-1 text-left truncate">{channel.name}</span>
      {channel.unreadCount ? (
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#5C6ECD] text-white">
          {channel.unreadCount}
        </span>
      ) : null}
    </button>
  )
}

// DM item
function DMItem({ channel, isActive, onClick }: { channel: Channel; isActive: boolean; onClick: () => void }) {
  const user = channel.participants?.[0]
  if (!user) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
        isActive ? "bg-[#5C6ECD]/10 text-[#5C6ECD] font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <div className="relative">
        <Avatar className="w-6 h-6">
          <AvatarImage src={user.avatar} />
          <AvatarFallback className="text-[10px]">{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5"><StatusDot status={user.status} /></div>
      </div>
      <span className="flex-1 text-left truncate">{user.name}</span>
      {user.isClient && <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-amber-500/10 text-amber-600">Client</span>}
      {channel.unreadCount ? (
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#5C6ECD] text-white">
          {channel.unreadCount}
        </span>
      ) : null}
    </button>
  )
}

// Message component
function MessageBubble({ message }: { message: Message }) {
  const user = teamMembers.find(u => u.id === message.userId)

  if (message.isSystemMessage) {
    return (
      <div className="flex items-center gap-2 py-2 px-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {message.content}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
    )
  }

  return (
    <div className={cn("group px-4 py-2 hover:bg-muted/50", message.isPinned && "bg-amber-500/5 border-l-2 border-amber-500")}>
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0">
          <AvatarImage src={user?.avatar} />
          <AvatarFallback className="bg-[#5C6ECD] text-white text-sm">{user?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{user?.name}</span>
            {user?.isClient && <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-amber-500/10 text-amber-600">Client</span>}
            <span className="text-xs text-muted-foreground">{message.timestamp}</span>
            {message.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
          </div>
          <p className="text-sm text-foreground mt-0.5">{message.content}</p>

          {/* Design Feedback */}
          {message.designFeedback && (
            <div className={cn(
              "mt-2 p-3 rounded-lg border inline-flex items-center gap-3",
              message.designFeedback.status === "approved" ? "bg-emerald-500/5 border-emerald-500/20" :
              message.designFeedback.status === "revision" ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/50 border-border"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                message.designFeedback.status === "approved" ? "bg-emerald-500/10" :
                message.designFeedback.status === "revision" ? "bg-amber-500/10" : "bg-[#5C6ECD]/10"
              )}>
                {message.designFeedback.status === "approved" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                 message.designFeedback.status === "revision" ? <AlertCircle className="w-4 h-4 text-amber-600" /> :
                 <Eye className="w-4 h-4 text-[#5C6ECD]" />}
              </div>
              <div>
                <p className="text-sm font-medium">{message.designFeedback.creativeName}</p>
                <p className="text-xs text-muted-foreground">Iteration {message.designFeedback.iterationNumber}</p>
              </div>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium ml-4",
                message.designFeedback.status === "approved" ? "bg-emerald-500/10 text-emerald-600" :
                message.designFeedback.status === "revision" ? "bg-amber-500/10 text-amber-600" : "bg-[#5C6ECD]/10 text-[#5C6ECD]"
              )}>
                {message.designFeedback.status === "approved" ? "Approved" : message.designFeedback.status === "revision" ? "Revision" : "Pending"}
              </span>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                <div key={att.id} className="relative rounded-lg overflow-hidden border border-border group/img">
                  <img src={att.url} alt={att.name} className="w-44 h-28 object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-xs text-white truncate">{att.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {message.reactions.map((r, i) => (
                <button key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80">
                  <span className="text-sm">{r.emoji}</span>
                  <span className="text-xs font-medium text-muted-foreground">{r.count}</span>
                </button>
              ))}
              <button className="p-1 rounded hover:bg-muted"><Plus className="w-3.5 h-3.5 text-muted-foreground" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function MessagesContent() {
  const [activeChannel, setActiveChannel] = useState<Channel>(groups[0])
  const [messages, setMessages] = useState<Message[]>(sampleMessages)
  const [newMessage, setNewMessage] = useState("")
  const [showGroups, setShowGroups] = useState(true)
  const [showDMs, setShowDMs] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!newMessage.trim()) return
    setMessages([...messages, {
      id: `m${messages.length + 1}`,
      userId: currentUser.id,
      content: newMessage,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    }])
    setNewMessage("")
  }

  const onlineMembers = teamMembers.filter(m => m.status === "online")
  const offlineMembers = teamMembers.filter(m => m.status !== "online")

  return (
    <main className="flex-1 flex overflow-hidden">
      {/* Left - Sidebar */}
      <div className="w-60 border-r border-border flex flex-col bg-card">
        <div className="p-3 border-b border-border">
          <Button className="w-full gap-2 bg-[#5C6ECD] hover:bg-[#4a5bb8] h-9">
            <Plus className="w-4 h-4" /> New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {/* Groups */}
            <div>
              <button onClick={() => setShowGroups(!showGroups)} className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                {showGroups ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} GROUPS
              </button>
              {showGroups && (
                <div className="mt-1 space-y-0.5">
                  {groups.map(g => (
                    <ChannelItem key={g.id} channel={g} isActive={activeChannel.id === g.id} onClick={() => setActiveChannel(g)} />
                  ))}
                </div>
              )}
            </div>

            {/* Direct Messages */}
            <div>
              <button onClick={() => setShowDMs(!showDMs)} className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                {showDMs ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} DIRECT MESSAGES
              </button>
              {showDMs && (
                <div className="mt-1 space-y-0.5">
                  {directMessages.map(dm => (
                    <DMItem key={dm.id} channel={dm} isActive={activeChannel.id === dm.id} onClick={() => setActiveChannel(dm)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Center - Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{activeChannel.name}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8"><Phone className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8"><Video className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8"><Pin className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8"><Users className="w-4 h-4" /></Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowRightPanel(!showRightPanel)}>
              {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="py-4">
            <div className="px-4 pb-4 mb-2 border-b border-border">
              <div className="w-10 h-10 rounded-lg bg-[#5C6ECD]/10 flex items-center justify-center mb-2">
                <Hash className="w-5 h-5 text-[#5C6ECD]" />
              </div>
              <h3 className="text-lg font-bold">Welcome to #{activeChannel.name}</h3>
              <p className="text-sm text-muted-foreground">This is the start of the channel.</p>
            </div>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="p-3 border-t border-border bg-card">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border border-border focus-within:border-[#5C6ECD]/50">
            <Button size="icon" variant="ghost" className="h-8 w-8"><Paperclip className="w-4 h-4" /></Button>
            <Button size="icon" variant="ghost" className="h-8 w-8"><ImageIcon className="w-4 h-4" /></Button>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={`Message #${activeChannel.name}`}
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8"><Smile className="w-4 h-4" /></Button>
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()} className="h-8 w-8 bg-[#5C6ECD] hover:bg-[#4a5bb8] disabled:opacity-50">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right - Members */}
      {showRightPanel && (
        <div className="w-64 border-l border-border flex flex-col bg-card">
          <div className="p-3 border-b border-border">
            <h3 className="font-semibold">#{activeChannel.name}</h3>
            <p className="text-xs text-muted-foreground">Team Channel</p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {/* Members */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">MEMBERS ({teamMembers.length})</h4>
                <div className="space-y-1">
                  {onlineMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer">
                      <div className="relative">
                        <Avatar className="w-7 h-7"><AvatarImage src={m.avatar} /><AvatarFallback className="text-[10px]">{m.name.charAt(0)}</AvatarFallback></Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5"><StatusDot status={m.status} /></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{m.role}</p>
                      </div>
                      {m.isClient && <span className="px-1 py-0.5 text-[9px] font-medium rounded bg-amber-500/10 text-amber-600">Client</span>}
                    </div>
                  ))}
                  {offlineMembers.length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground pt-2 pb-1">Offline</p>
                      {offlineMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer opacity-60">
                          <div className="relative">
                            <Avatar className="w-7 h-7"><AvatarImage src={m.avatar} /><AvatarFallback className="text-[10px]">{m.name.charAt(0)}</AvatarFallback></Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5"><StatusDot status={m.status} /></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{m.role}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Pinned */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">PINNED</h4>
                <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <Pin className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-xs">Sarah Chen approved Hero Banner v3</p>
                      <p className="text-[10px] text-muted-foreground">10:30 AM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </main>
  )
}
