"use client"

import * as React from "react"

import {
  getSystemTimeZone,
  parseTimezonePreference,
  persistResolvedTimeZone,
  resolveTimeZone,
} from "@/lib/timezone-preference"

interface TimezoneContextValue {
  preference: string
  timeZone: string
  setPreference: (next: string) => void
}

const TimezoneContext = React.createContext<TimezoneContextValue>({
  preference: "system",
  timeZone: "UTC",
  setPreference: () => {},
})

export function TimezoneProvider({
  preference: initialPreference,
  resolvedTimeZone,
  children,
}: {
  preference?: string | null
  resolvedTimeZone?: string | null
  children: React.ReactNode
}) {
  const [preference, setPreferenceState] = React.useState(() =>
    parseTimezonePreference(initialPreference)
  )
  const [timeZone, setTimeZone] = React.useState(() =>
    resolveTimeZone(initialPreference, resolvedTimeZone)
  )

  const setPreference = React.useCallback((next: string) => {
    const parsed = parseTimezonePreference(next)
    const resolved =
      parsed === "system" ? getSystemTimeZone() : parsed
    setPreferenceState(parsed)
    setTimeZone(resolved)
    persistResolvedTimeZone(resolved)
  }, [])

  React.useLayoutEffect(() => {
    const parsed = parseTimezonePreference(initialPreference)
    const resolved =
      parsed === "system"
        ? getSystemTimeZone()
        : resolveTimeZone(parsed, resolvedTimeZone)
    setPreferenceState(parsed)
    setTimeZone(resolved)
    persistResolvedTimeZone(resolved)
  }, [initialPreference, resolvedTimeZone])

  const value = React.useMemo(
    () => ({ preference, timeZone, setPreference }),
    [preference, timeZone, setPreference]
  )

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone() {
  return React.useContext(TimezoneContext)
}
