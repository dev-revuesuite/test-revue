"use client"

import { useState, useEffect, useRef } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  Users,
  MapPin,
  X,
  Search,
  ArrowRight,
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle,
  Link2,
  Copy,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

// Types
interface Participant {
  id: string
  name: string
  email: string
  avatar?: string
  status: "pending" | "accepted" | "rejected"
}

type EventType = "event" | "meeting"

interface Event {
  id: string
  title: string
  type: EventType
  date: Date
  startTime: string
  endTime: string
  color: "red" | "blue" | "orange" | "green" | "purple"
  participants: Participant[]
  location?: string
  meetingLink?: string
  description?: string
  userRsvp?: "pending" | "accepted" | "declined" | "maybe"
}

// Sample data
const teamMembers: Participant[] = [
  { id: "t1", name: "Sarah Chen", email: "sarah.chen@acme.com", avatar: "https://i.pravatar.cc/150?img=1", status: "pending" },
  { id: "t2", name: "Jacob Hawkins", email: "jacob.hawkins@acme.com", avatar: "https://i.pravatar.cc/150?img=2", status: "accepted" },
  { id: "t3", name: "Regina Cooper", email: "regina.cooper@acme.com", avatar: "https://i.pravatar.cc/150?img=3", status: "accepted" },
  { id: "t4", name: "Mike Johnson", email: "mike.johnson@acme.com", avatar: "https://i.pravatar.cc/150?img=4", status: "rejected" },
  { id: "t5", name: "Jane Wilson", email: "jane.wilson@acme.com", avatar: "https://i.pravatar.cc/150?img=5", status: "pending" },
]

const clients: Participant[] = [
  { id: "c1", name: "TechVision Inc", email: "contact@techvision.com", avatar: "https://i.pravatar.cc/150?img=10", status: "pending" },
  { id: "c2", name: "Acme Corp", email: "hello@acme.com", avatar: "https://i.pravatar.cc/150?img=11", status: "pending" },
  { id: "c3", name: "StartupXYZ", email: "team@startupxyz.io", avatar: "https://i.pravatar.cc/150?img=12", status: "pending" },
  { id: "c4", name: "Design Studio", email: "info@designstudio.co", avatar: "https://i.pravatar.cc/150?img=13", status: "pending" },
]

// Mock busy slots for participants (for availability scheduler)
interface BusySlot {
  start: string
  end: string
}

const participantBusySlots: Record<string, BusySlot[]> = {
  "t1": [{ start: "09:00", end: "10:30" }, { start: "14:00", end: "15:00" }],
  "t2": [{ start: "10:00", end: "11:00" }, { start: "15:00", end: "16:30" }],
  "t3": [{ start: "08:00", end: "09:30" }, { start: "13:00", end: "14:00" }],
  "t4": [{ start: "11:00", end: "12:00" }, { start: "16:00", end: "17:00" }],
  "t5": [{ start: "09:30", end: "10:30" }, { start: "14:30", end: "15:30" }],
  "c1": [{ start: "10:00", end: "11:30" }, { start: "14:00", end: "15:00" }],
  "c2": [{ start: "09:00", end: "10:00" }, { start: "13:00", end: "14:30" }],
  "c3": [{ start: "11:00", end: "12:00" }],
  "c4": [{ start: "15:00", end: "16:00" }],
}

const SCHEDULER_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]

const sampleEvents: Event[] = [
  {
    id: "1",
    title: "Design Review - Homepage Banner",
    type: "meeting",
    date: new Date(),
    startTime: "09:00",
    endTime: "10:30",
    color: "red",
    participants: [teamMembers[0], teamMembers[1], clients[0]],
    meetingLink: "https://zoom.us/j/123456789",
    description: "Review the latest homepage banner designs with the client",
    userRsvp: "pending"
  },
  {
    id: "2",
    title: "Sprint Planning",
    type: "meeting",
    date: new Date(),
    startTime: "14:00",
    endTime: "15:00",
    color: "blue",
    participants: [teamMembers[1], teamMembers[2], teamMembers[4]],
    meetingLink: "https://meet.google.com/abc-defg-hij",
    userRsvp: "accepted"
  },
  {
    id: "3",
    title: "Client Presentation - TechVision",
    type: "event",
    date: new Date(Date.now() + 86400000),
    startTime: "11:00",
    endTime: "12:30",
    color: "orange",
    participants: [teamMembers[0], teamMembers[3], clients[0]],
    location: "Conference Room A",
    userRsvp: "pending"
  },
  {
    id: "4",
    title: "Weekly Standup",
    type: "meeting",
    date: new Date(Date.now() + 86400000 * 2),
    startTime: "10:00",
    endTime: "10:30",
    color: "green",
    participants: [teamMembers[1], teamMembers[2], teamMembers[4]],
    meetingLink: "https://zoom.us/j/987654321",
    userRsvp: "accepted"
  },
  {
    id: "5",
    title: "Marketing Sync",
    type: "meeting",
    date: new Date(Date.now() + 86400000 * 3),
    startTime: "15:00",
    endTime: "16:00",
    color: "purple",
    participants: [teamMembers[0], teamMembers[4], clients[1]],
    userRsvp: "maybe"
  },
  {
    id: "6",
    title: "Product Demo",
    type: "event",
    date: new Date(Date.now() + 86400000 * 4),
    startTime: "13:00",
    endTime: "14:00",
    color: "blue",
    participants: [teamMembers[1], teamMembers[3], clients[2]],
    meetingLink: "https://zoom.us/j/555666777"
  },
]

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`)

const colorClasses = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500"
}

const colorBgClasses = {
  red: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20",
  blue: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20",
  orange: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20",
  green: "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20",
  purple: "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
}

const statusColors = {
  pending: "bg-amber-100 text-amber-600",
  accepted: "bg-emerald-100 text-emerald-600",
  rejected: "bg-red-100 text-red-600"
}

type ViewType = "today" | "week" | "month"

export function CalendarContent() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>(sampleEvents)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [viewType, setViewType] = useState<ViewType>("week")
  const [currentTime, setCurrentTime] = useState(new Date())
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll to current time on mount and view change
  useEffect(() => {
    if (viewType === "today" || viewType === "week") {
      const scrollToCurrentTime = () => {
        if (scrollContainerRef.current) {
          const hours = new Date().getHours()
          // Each hour row is 64px for today view (h-16) and 56px for week view (h-14)
          const hourHeight = viewType === "today" ? 64 : 56
          // Scroll to 2 hours before current time for context
          const scrollTo = Math.max(0, (hours - 2) * hourHeight)
          scrollContainerRef.current.scrollTop = scrollTo
        }
      }
      // Small delay to ensure DOM is ready
      setTimeout(scrollToCurrentTime, 100)
    }
  }, [viewType])

  // Get current time position as percentage
  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    return (hours * 60 + minutes) / (24 * 60) * 100
  }

  // New event form state
  const [newEvent, setNewEvent] = useState({
    title: "",
    addMeetingLink: false,
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    participants: [] as Participant[],
    meetingLink: "",
    location: "",
    color: "blue" as Event["color"]
  })
  const [copiedLink, setCopiedLink] = useState(false)
  const [searchPeople, setSearchPeople] = useState("")
  const [participantTab, setParticipantTab] = useState<"team" | "clients">("team")

  // Get week dates
  const getWeekDates = (date: Date) => {
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date.setDate(diff))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  const weekDates = getWeekDates(new Date(currentDate))

  // Calendar calculations for month view
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    let startingDay = firstDay.getDay() - 1
    if (startingDay < 0) startingDay = 6

    const days: (Date | null)[] = []
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate)
    if (viewType === "today") {
      newDate.setDate(newDate.getDate() + direction)
    } else if (viewType === "week") {
      newDate.setDate(newDate.getDate() + direction * 7)
    } else {
      newDate.setMonth(newDate.getMonth() + direction)
    }
    setCurrentDate(newDate)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(e => e.date.toDateString() === date.toDateString())
  }

  const getTimePosition = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number)
    return (hours * 60 + minutes) / (24 * 60) * 100
  }

  const getEventHeight = (start: string, end: string) => {
    const startPos = getTimePosition(start)
    const endPos = getTimePosition(end)
    return endPos - startPos
  }

  const generateMeetingLink = () => {
    const randomId = Math.random().toString(36).substring(2, 11)
    return `https://meet.revue.app/${randomId}`
  }

  const handleCreateEvent = () => {
    const event: Event = {
      id: Date.now().toString(),
      title: newEvent.title,
      type: newEvent.addMeetingLink ? "meeting" : "event",
      date: new Date(newEvent.date),
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      color: newEvent.color,
      participants: newEvent.participants,
      meetingLink: newEvent.meetingLink || undefined,
      location: newEvent.location || undefined,
      userRsvp: "pending"
    }
    setEvents([...events, event])
    setShowCreateModal(false)
    setNewEvent({
      title: "",
      addMeetingLink: false,
      date: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "10:00",
      participants: [],
      meetingLink: "",
      location: "",
      color: "blue"
    })
    setParticipantTab("team")
  }

  const handleRsvp = (eventId: string, status: "accepted" | "declined" | "maybe") => {
    setEvents(events.map(event =>
      event.id === eventId ? { ...event, userRsvp: status } : event
    ))
    if (selectedEvent?.id === eventId) {
      setSelectedEvent({ ...selectedEvent, userRsvp: status })
    }
  }

  const copyMeetingLink = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const toggleParticipant = (participant: Participant) => {
    const isSelected = newEvent.participants.find(p => p.id === participant.id)
    if (isSelected) {
      setNewEvent({
        ...newEvent,
        participants: newEvent.participants.filter(p => p.id !== participant.id)
      })
    } else {
      setNewEvent({
        ...newEvent,
        participants: [...newEvent.participants, { ...participant, status: "pending" }]
      })
    }
  }

  const removeParticipant = (id: string) => {
    setNewEvent({
      ...newEvent,
      participants: newEvent.participants.filter(p => p.id !== id)
    })
  }

  const isParticipantSelected = (id: string) => {
    return newEvent.participants.some(p => p.id === id)
  }

  const filteredTeamMembers = teamMembers.filter(p =>
    p.name.toLowerCase().includes(searchPeople.toLowerCase()) ||
    p.email.toLowerCase().includes(searchPeople.toLowerCase())
  )

  const filteredClients = clients.filter(p =>
    p.name.toLowerCase().includes(searchPeople.toLowerCase()) ||
    p.email.toLowerCase().includes(searchPeople.toLowerCase())
  )

  // Get busy slot position and width for scheduler
  const getBusySlotStyle = (slot: BusySlot) => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number)
      return hours * 60 + minutes
    }
    const startMinutes = parseTime(slot.start) - parseTime("08:00")
    const endMinutes = parseTime(slot.end) - parseTime("08:00")
    const totalMinutes = 10 * 60 // 08:00 to 18:00

    return {
      left: `${(startMinutes / totalMinutes) * 100}%`,
      width: `${((endMinutes - startMinutes) / totalMinutes) * 100}%`
    }
  }

  // Get selected time slot position
  const getSelectedSlotStyle = () => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number)
      return hours * 60 + minutes
    }
    const startMinutes = parseTime(newEvent.startTime) - parseTime("08:00")
    const endMinutes = parseTime(newEvent.endTime) - parseTime("08:00")
    const totalMinutes = 10 * 60

    return {
      left: `${(startMinutes / totalMinutes) * 100}%`,
      width: `${((endMinutes - startMinutes) / totalMinutes) * 100}%`
    }
  }

  // Check if a time slot conflicts with any participant's busy slots
  const hasConflict = () => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number)
      return hours * 60 + minutes
    }
    const selectedStart = parseTime(newEvent.startTime)
    const selectedEnd = parseTime(newEvent.endTime)

    return newEvent.participants.some(p => {
      const busySlots = participantBusySlots[p.id] || []
      return busySlots.some(slot => {
        const busyStart = parseTime(slot.start)
        const busyEnd = parseTime(slot.end)
        return selectedStart < busyEnd && selectedEnd > busyStart
      })
    })
  }

  // Find suggested available slots
  const getSuggestedSlots = () => {
    if (newEvent.participants.length === 0) return []

    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number)
      return hours * 60 + minutes
    }

    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
    }

    // Get all busy slots for selected participants
    const allBusySlots: { start: number; end: number }[] = []
    newEvent.participants.forEach(p => {
      const slots = participantBusySlots[p.id] || []
      slots.forEach(slot => {
        allBusySlots.push({
          start: parseTime(slot.start),
          end: parseTime(slot.end)
        })
      })
    })

    // Sort and merge overlapping slots
    allBusySlots.sort((a, b) => a.start - b.start)
    const mergedBusy: { start: number; end: number }[] = []
    allBusySlots.forEach(slot => {
      if (mergedBusy.length === 0 || mergedBusy[mergedBusy.length - 1].end < slot.start) {
        mergedBusy.push({ ...slot })
      } else {
        mergedBusy[mergedBusy.length - 1].end = Math.max(mergedBusy[mergedBusy.length - 1].end, slot.end)
      }
    })

    // Find free slots (minimum 30 minutes)
    const freeSlots: { start: string; end: string }[] = []
    const dayStart = parseTime("08:00")
    const dayEnd = parseTime("18:00")
    let currentStart = dayStart

    mergedBusy.forEach(busy => {
      if (busy.start > currentStart && busy.start - currentStart >= 30) {
        freeSlots.push({
          start: formatTime(currentStart),
          end: formatTime(busy.start)
        })
      }
      currentStart = Math.max(currentStart, busy.end)
    })

    if (dayEnd > currentStart && dayEnd - currentStart >= 30) {
      freeSlots.push({
        start: formatTime(currentStart),
        end: formatTime(dayEnd)
      })
    }

    return freeSlots.slice(0, 3) // Return top 3 suggestions
  }

  const formatDateRange = () => {
    if (viewType === "today") {
      return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    } else if (viewType === "week") {
      const start = weekDates[0]
      const end = weekDates[6]
      if (start.getMonth() === end.getMonth()) {
        return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
      }
      return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${MONTHS[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }

  return (
    <main className="flex-1 flex overflow-hidden bg-background h-full">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewType("today")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  viewType === "today" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Today
              </button>
              <button
                onClick={() => setViewType("week")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  viewType === "week" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setViewType("month")}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  viewType === "month" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Month
              </button>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <h2 className="text-lg font-semibold">{formatDateRange()}</h2>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 bg-[#5C6ECD] hover:bg-[#4a5bb8]"
          >
            <Plus className="w-4 h-4" /> New Event
          </Button>
        </div>

        {/* Calendar Content */}
        {viewType === "today" && (
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
            <div className="flex">
              {/* Time Column */}
              <div className="w-16 flex-shrink-0 border-r border-border">
                {HOURS.map(hour => (
                  <div key={hour} className="h-16 border-b border-border/50 px-2 py-1">
                    <span className="text-xs text-muted-foreground">{hour}</span>
                  </div>
                ))}
              </div>

              {/* Day Column */}
              <div className="flex-1 relative">
                {/* Hour grid lines */}
                {HOURS.map(hour => (
                  <div key={hour} className="h-16 border-b border-border/50" />
                ))}

                {/* Current Time Indicator */}
                {isToday(currentDate) && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${getCurrentTimePosition()}%` }}
                  >
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Events */}
                <div className="absolute inset-0 p-1">
                  {getEventsForDate(currentDate).map(event => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={cn(
                        "absolute left-1 right-1 rounded-lg border p-2 cursor-pointer transition-all",
                        colorBgClasses[event.color],
                        selectedEvent?.id === event.id && "ring-2 ring-[#5C6ECD]"
                      )}
                      style={{
                        top: `${getTimePosition(event.startTime)}%`,
                        height: `${getEventHeight(event.startTime, event.endTime)}%`,
                        minHeight: "40px"
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {event.type === "meeting" && <Video className="w-3.5 h-3.5 shrink-0" />}
                        <p className="font-medium text-sm truncate">{event.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{event.startTime} - {event.endTime}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewType === "week" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Week Header */}
            <div className="flex border-b border-border flex-shrink-0">
              <div className="w-16 flex-shrink-0 border-r border-border" />
              {weekDates.map((date, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 py-3 text-center border-r border-border last:border-r-0",
                    isToday(date) && "bg-[#5C6ECD]/5"
                  )}
                >
                  <div className="text-xs text-muted-foreground">{DAYS[i]}</div>
                  <div className={cn(
                    "text-lg font-semibold mt-1",
                    isToday(date) && "text-[#5C6ECD]"
                  )}>
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Week Grid */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
              <div className="flex min-h-full">
                {/* Time Column */}
                <div className="w-16 flex-shrink-0 border-r border-border">
                  {HOURS.map(hour => (
                    <div key={hour} className="h-14 border-b border-border/50 px-2 py-1">
                      <span className="text-xs text-muted-foreground">{hour}</span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDates.map((date, dayIndex) => (
                  <div key={dayIndex} className={cn(
                    "flex-1 relative border-r border-border last:border-r-0",
                    isToday(date) && "bg-[#5C6ECD]/5"
                  )}>
                    {HOURS.map(hour => (
                      <div key={hour} className="h-14 border-b border-border/50" />
                    ))}

                    {/* Current Time Indicator */}
                    {isToday(date) && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: `${getCurrentTimePosition()}%` }}
                      >
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-0.5 bg-red-500" />
                        </div>
                      </div>
                    )}

                    {/* Events */}
                    <div className="absolute inset-0 p-0.5">
                      {getEventsForDate(date).map(event => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded border p-1.5 cursor-pointer transition-all text-xs",
                            colorBgClasses[event.color],
                            selectedEvent?.id === event.id && "ring-2 ring-[#5C6ECD]"
                          )}
                          style={{
                            top: `${getTimePosition(event.startTime)}%`,
                            height: `${getEventHeight(event.startTime, event.endTime)}%`,
                            minHeight: "32px"
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {event.type === "meeting" && <Video className="w-3 h-3 shrink-0" />}
                            <p className="font-medium truncate">{event.title}</p>
                          </div>
                          <p className="text-muted-foreground truncate">{event.startTime}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewType === "month" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* Month Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentDate).map((date, i) => (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[120px] border border-border rounded-lg p-2 transition-colors",
                      !date && "bg-muted/30 border-transparent",
                      date && isToday(date) && "bg-[#5C6ECD]/5 border-[#5C6ECD]/30"
                    )}
                  >
                    {date && (
                      <>
                        <div className={cn(
                          "text-sm font-medium mb-2",
                          isToday(date) && "text-[#5C6ECD]"
                        )}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {getEventsForDate(date).slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={cn(
                                "text-xs p-1.5 rounded cursor-pointer border flex items-center gap-1",
                                colorBgClasses[event.color]
                              )}
                            >
                              {event.type === "meeting" && <Video className="w-3 h-3 shrink-0" />}
                              <span className="truncate"><span className="font-medium">{event.startTime}</span> {event.title}</span>
                            </div>
                          ))}
                          {getEventsForDate(date).length > 3 && (
                            <div className="text-xs text-muted-foreground px-1">
                              +{getEventsForDate(date).length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Event Details */}
      {selectedEvent && (
        <div className="w-80 border-l border-border flex flex-col bg-card flex-shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-xs font-medium text-[#5C6ECD] uppercase">
                  {selectedEvent.date.toLocaleDateString("en-US", { month: "short" })}
                </div>
                <div className="text-2xl font-bold">{selectedEvent.date.getDate()}</div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", colorClasses[selectedEvent.color])} />
                  <span className="text-xs font-medium capitalize">{selectedEvent.type}</span>
                </div>
                <p className="font-semibold truncate max-w-[180px]">{selectedEvent.title}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedEvent(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Time Display */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{selectedEvent.startTime}</div>
                <div className="text-xs text-muted-foreground">Start</div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className="text-center">
                <div className="text-3xl font-bold">{selectedEvent.endTime}</div>
                <div className="text-xs text-muted-foreground">End</div>
              </div>
            </div>

            {selectedEvent.meetingLink && (
              <Button className="w-full mt-4 gap-2 bg-[#5C6ECD] hover:bg-[#4a5bb8]" onClick={() => window.open(selectedEvent.meetingLink, "_blank")}>
                <Video className="w-4 h-4" />
                Join Meeting
              </Button>
            )}
          </div>

          {/* RSVP Section */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Your Response</h4>
              {selectedEvent.userRsvp && selectedEvent.userRsvp !== "pending" && (
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium capitalize",
                  selectedEvent.userRsvp === "accepted" && "bg-emerald-100 text-emerald-600",
                  selectedEvent.userRsvp === "declined" && "bg-red-100 text-red-600",
                  selectedEvent.userRsvp === "maybe" && "bg-amber-100 text-amber-600"
                )}>
                  {selectedEvent.userRsvp}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedEvent.userRsvp === "accepted" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1 gap-1.5",
                  selectedEvent.userRsvp === "accepted" && "bg-emerald-500 hover:bg-emerald-600"
                )}
                onClick={() => handleRsvp(selectedEvent.id, "accepted")}
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </Button>
              <Button
                variant={selectedEvent.userRsvp === "maybe" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1 gap-1.5",
                  selectedEvent.userRsvp === "maybe" && "bg-amber-500 hover:bg-amber-600"
                )}
                onClick={() => handleRsvp(selectedEvent.id, "maybe")}
              >
                <HelpCircle className="w-4 h-4" />
                Maybe
              </Button>
              <Button
                variant={selectedEvent.userRsvp === "declined" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1 gap-1.5",
                  selectedEvent.userRsvp === "declined" && "bg-red-500 hover:bg-red-600"
                )}
                onClick={() => handleRsvp(selectedEvent.id, "declined")}
              >
                <XCircle className="w-4 h-4" />
                Decline
              </Button>
            </div>
          </div>

          {/* Details */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {selectedEvent.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.location && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Location</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    {selectedEvent.location}
                  </div>
                </div>
              )}

              {selectedEvent.meetingLink && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Meeting Link</h4>
                  <a href={selectedEvent.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sm text-[#5C6ECD] hover:underline break-all">
                    {selectedEvent.meetingLink}
                  </a>
                </div>
              )}

              {/* Participants */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Participants ({selectedEvent.participants.length})</h4>
                </div>
                <div className="space-y-2">
                  {selectedEvent.participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={p.avatar} />
                          <AvatarFallback className="bg-[#5C6ECD] text-white text-sm">{p.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{p.name}</span>
                      </div>
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium capitalize", statusColors[p.status])}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Create Event Modal - Large Two-Column Layout */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h2 className="text-xl font-semibold">Schedule Event</h2>
                <p className="text-sm text-muted-foreground">Create and schedule a new event with participants</p>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Main Content - Two Columns */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column - Event Details */}
              <div className="w-[400px] border-r border-border flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Event Title</label>
                      <Input
                        placeholder="Enter event title..."
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Date
                      </label>
                      <Input
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Time
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                          <Input
                            type="time"
                            value={newEvent.startTime}
                            onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                            className="h-10"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">End</label>
                          <Input
                            type="time"
                            value={newEvent.endTime}
                            onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        Location
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <Input
                        placeholder="Conference Room, Office, etc."
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    {/* Add Meeting Link */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                        <input
                          type="checkbox"
                          id="addMeetingLink"
                          checked={newEvent.addMeetingLink}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setNewEvent({
                              ...newEvent,
                              addMeetingLink: checked,
                              meetingLink: checked && !newEvent.meetingLink ? generateMeetingLink() : newEvent.meetingLink
                            })
                          }}
                          className="w-4 h-4 rounded border-border text-[#5C6ECD] focus:ring-[#5C6ECD] accent-[#5C6ECD]"
                        />
                        <label htmlFor="addMeetingLink" className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none flex-1">
                          <Video className="w-4 h-4 text-[#5C6ECD]" />
                          Add Meeting Link
                        </label>
                      </div>

                      {newEvent.addMeetingLink && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://zoom.us/j/..."
                            value={newEvent.meetingLink}
                            onChange={(e) => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                            className="flex-1 h-10"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 h-10 px-3"
                            onClick={() => setNewEvent({ ...newEvent, meetingLink: generateMeetingLink() })}
                          >
                            <Link2 className="w-4 h-4 mr-1" />
                            Generate
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Color */}
                    <div>
                      <label className="text-sm font-medium mb-3 block">Event Color</label>
                      <div className="flex gap-3">
                        {(["red", "blue", "orange", "green", "purple"] as const).map(color => (
                          <button
                            key={color}
                            onClick={() => setNewEvent({ ...newEvent, color })}
                            className={cn(
                              "w-10 h-10 rounded-full transition-all",
                              colorClasses[color],
                              newEvent.color === color ? "ring-2 ring-offset-2 ring-[#5C6ECD] scale-110" : "hover:scale-105"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Right Column - Participants & Scheduler */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Participants Section */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#5C6ECD]" />
                      <h3 className="font-semibold">Participants</h3>
                      {newEvent.participants.length > 0 && (
                        <span className="px-2 py-0.5 bg-[#5C6ECD] text-white text-xs rounded-full">
                          {newEvent.participants.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selected participants */}
                  {newEvent.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {newEvent.participants.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#5C6ECD]/10 border border-[#5C6ECD]/20">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={p.avatar} />
                            <AvatarFallback className="text-xs bg-[#5C6ECD] text-white">{p.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{p.name}</span>
                          <button onClick={() => removeParticipant(p.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search and Tabs */}
                  <div className="flex gap-3 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        className="pl-9 h-10"
                        value={searchPeople}
                        onChange={(e) => setSearchPeople(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                      <button
                        onClick={() => setParticipantTab("team")}
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                          participantTab === "team" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Team
                      </button>
                      <button
                        onClick={() => setParticipantTab("clients")}
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                          participantTab === "clients" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Clients
                      </button>
                    </div>
                  </div>

                  {/* Participant List */}
                  <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto">
                    {(participantTab === "team" ? filteredTeamMembers : filteredClients).map(person => (
                      <button
                        key={person.id}
                        onClick={() => toggleParticipant(person)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 transition-colors rounded-lg text-left",
                          isParticipantSelected(person.id)
                            ? "bg-[#5C6ECD]/10 border border-[#5C6ECD]"
                            : "bg-muted/50 border border-transparent hover:border-border"
                        )}
                      >
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={person.avatar} />
                          <AvatarFallback className={cn(
                            "text-sm text-white",
                            participantTab === "team" ? "bg-[#5C6ECD]" : "bg-orange-500"
                          )}>{person.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{person.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          isParticipantSelected(person.id)
                            ? "bg-[#5C6ECD] border-[#5C6ECD]"
                            : "border-muted-foreground/30"
                        )}>
                          {isParticipantSelected(person.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Availability Scheduler */}
                <div className="flex-1 p-6 overflow-auto bg-muted/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#5C6ECD]" />
                      <h3 className="font-semibold">Availability</h3>
                    </div>
                    {hasConflict() && newEvent.participants.length > 0 && (
                      <div className="flex items-center gap-1 text-amber-600 text-sm">
                        <HelpCircle className="w-4 h-4" />
                        Time conflicts detected
                      </div>
                    )}
                  </div>

                  {newEvent.participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <Users className="w-10 h-10 mb-3 opacity-50" />
                      <p className="text-sm">Add participants to see their availability</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Time Header */}
                      <div className="flex items-center pl-28">
                        <div className="flex-1 flex justify-between text-xs text-muted-foreground">
                          {SCHEDULER_HOURS.map(hour => (
                            <span key={hour} className="w-0">{hour.split(":")[0]}</span>
                          ))}
                        </div>
                      </div>

                      {/* Participant Rows */}
                      <div className="space-y-2">
                        {newEvent.participants.map(participant => {
                          const busySlots = participantBusySlots[participant.id] || []
                          return (
                            <div key={participant.id} className="flex items-center gap-3">
                              <div className="w-24 flex items-center gap-2 shrink-0">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={participant.avatar} />
                                  <AvatarFallback className="text-xs bg-[#5C6ECD] text-white">{participant.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">{participant.name.split(" ")[0]}</span>
                              </div>
                              <div className="flex-1 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded relative">
                                {/* Busy slots */}
                                {busySlots.map((slot, i) => (
                                  <div
                                    key={i}
                                    className="absolute top-0 bottom-0 bg-red-400/60 dark:bg-red-500/40 rounded"
                                    style={getBusySlotStyle(slot)}
                                    title={`Busy: ${slot.start} - ${slot.end}`}
                                  />
                                ))}
                                {/* Selected time indicator */}
                                <div
                                  className={cn(
                                    "absolute top-0 bottom-0 rounded border-2",
                                    hasConflict() ? "border-amber-500 bg-amber-500/20" : "border-[#5C6ECD] bg-[#5C6ECD]/20"
                                  )}
                                  style={getSelectedSlotStyle()}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex items-center gap-4 pt-3 border-t border-border text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-900/30" />
                          <span className="text-muted-foreground">Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded bg-red-400/60 dark:bg-red-500/40" />
                          <span className="text-muted-foreground">Busy</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded border-2 border-[#5C6ECD] bg-[#5C6ECD]/20" />
                          <span className="text-muted-foreground">Selected</span>
                        </div>
                      </div>

                      {/* Suggested Slots */}
                      {getSuggestedSlots().length > 0 && (
                        <div className="pt-3 border-t border-border">
                          <p className="text-sm font-medium mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            Suggested Available Slots
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {getSuggestedSlots().map((slot, i) => (
                              <button
                                key={i}
                                onClick={() => setNewEvent({ ...newEvent, startTime: slot.start, endTime: slot.end })}
                                className="px-3 py-1.5 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                              >
                                {slot.start} - {slot.end}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30">
              <div className="text-sm text-muted-foreground">
                {newEvent.participants.length > 0 && (
                  <span>{newEvent.participants.length} participant{newEvent.participants.length !== 1 ? "s" : ""} invited</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#5C6ECD] hover:bg-[#4a5bb8] px-6"
                  disabled={!newEvent.title || (newEvent.addMeetingLink && !newEvent.meetingLink)}
                  onClick={handleCreateEvent}
                >
                  Create Event
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
