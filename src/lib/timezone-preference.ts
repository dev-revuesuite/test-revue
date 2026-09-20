export const TIMEZONE_COOKIE = "rs_timezone"

export type TimezoneOption = {
  id: string
  label: string
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { id: "system", label: "System" },
  { id: "UTC", label: "UTC" },
  { id: "Asia/Kolkata", label: "India (Kolkata)" },
  { id: "Asia/Dubai", label: "Dubai" },
  { id: "Asia/Singapore", label: "Singapore" },
  { id: "Australia/Sydney", label: "Sydney" },
  { id: "Europe/London", label: "London" },
  { id: "Europe/Berlin", label: "Berlin" },
  { id: "America/New_York", label: "New York" },
  { id: "America/Los_Angeles", label: "Los Angeles" },
]

const LEGACY_LABEL_TO_IANA: Record<string, string> = {
  "(GMT +05:30) India Standard Time": "Asia/Kolkata",
  "(GMT +00:00) UTC": "UTC",
  "(GMT -05:00) Eastern Time": "America/New_York",
  "(GMT -08:00) Pacific Time": "America/Los_Angeles",
  System: "system",
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
}

export function isValidTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function getSystemTimeZone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return zone && isValidTimeZone(zone) ? zone : "UTC"
  } catch {
    return "UTC"
  }
}

export function parseTimezonePreference(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "system"
  const trimmed = value.trim()
  if (trimmed === "system") return "system"
  const mapped = LEGACY_LABEL_TO_IANA[trimmed]
  if (mapped) return mapped
  return isValidTimeZone(trimmed) ? trimmed : "system"
}

export function resolveTimeZone(
  preference: unknown,
  fallbackResolved?: string | null
): string {
  const parsed = parseTimezonePreference(preference)
  if (parsed !== "system") return parsed
  if (fallbackResolved && isValidTimeZone(fallbackResolved)) {
    return fallbackResolved
  }
  return getSystemTimeZone()
}

export function timezoneOptionLabel(id: string): string {
  return TIMEZONE_OPTIONS.find((option) => option.id === id)?.label ?? id.replace(/_/g, " ")
}

export function timezoneIdFromLabel(label: string): string {
  return TIMEZONE_OPTIONS.find((option) => option.label === label)?.id ?? "system"
}

export function timezoneDropdownOptions(preference: string): TimezoneOption[] {
  if (
    preference !== "system" &&
    isValidTimeZone(preference) &&
    !TIMEZONE_OPTIONS.some((option) => option.id === preference)
  ) {
    return [
      ...TIMEZONE_OPTIONS,
      { id: preference, label: preference.replace(/_/g, " ") },
    ]
  }
  return TIMEZONE_OPTIONS
}

export function persistResolvedTimeZone(timeZone: string) {
  if (!isValidTimeZone(timeZone)) return
  try {
    localStorage.setItem(TIMEZONE_COOKIE, timeZone)
  } catch {
    // Private browsing or blocked storage.
  }
  if (typeof document === "undefined") return
  document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(timeZone)}; Path=/; Max-Age=31536000; SameSite=Lax`
}

export function formatCalendarDate(
  value: string,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
  if (!DATE_ONLY.test(value)) return "—"
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return date.toLocaleDateString("en-US", { ...options, timeZone: "UTC" })
}

export function formatInstantInZone(
  value: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    ...options,
    timeZone: isValidTimeZone(timeZone) ? timeZone : "UTC",
  })
}

export function formatDisplayDate(
  value: string | Date | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
  if (!value) return "—"
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    return formatCalendarDate(value, options)
  }
  return formatInstantInZone(value, timeZone, options)
}

export function formatDateRangeInZone(
  start: string | null | undefined,
  end: string | null | undefined,
  timeZone: string
): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  const startLabel = start ? formatDisplayDate(start, timeZone, options) : null
  const endLabel = end ? formatDisplayDate(end, timeZone, options) : null
  if (startLabel && startLabel !== "—" && endLabel && endLabel !== "—") {
    return `${startLabel} - ${endLabel}`
  }
  if (startLabel && startLabel !== "—") return `From ${startLabel}`
  if (endLabel && endLabel !== "—") return `Until ${endLabel}`
  return "No dates set"
}

export function formatRelativeTimeInZone(
  dateStr: string,
  timeZone: string
): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return "—"

  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

  return formatInstantInZone(date, timeZone)
}

export function calendarDateString(
  value: string | Date,
  timeZone: string
): string {
  if (typeof value === "string" && DATE_ONLY.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: isValidTimeZone(timeZone) ? timeZone : "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function daysUntilDate(
  end: string | null | undefined,
  timeZone: string,
  from = new Date()
): number {
  if (!end) return 0
  const today = calendarDateString(from, timeZone)
  const endDay = calendarDateString(end, timeZone)
  if (!today || !endDay) return 0
  const diff =
    Date.parse(`${endDay}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)
  return Math.max(0, Math.round(diff / 86400000))
}

export function greetingInTimeZone(timeZone: string): string {
  const hourValue = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: isValidTimeZone(timeZone) ? timeZone : "UTC",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "hour")?.value
  const hour = Number(hourValue ?? "0")
  if (hour < 12) return "Good Morning"
  if (hour < 17) return "Good Afternoon"
  return "Good Evening"
}
