"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

let previousNavigationPath: string | null = null
let currentNavigationPath: string | null = null

/** Path before the latest navigation (still stale during the destination page's first effect). */
export function getCurrentNavigationPath(): string | null {
  return currentNavigationPath
}

export function NavigationPathTracker() {
  const pathname = usePathname()

  useEffect(() => {
    previousNavigationPath = currentNavigationPath
    currentNavigationPath = pathname
  }, [pathname])

  return null
}
