"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="p-2 rounded-md bg-secondary">
        <span className="material-symbols-outlined text-xl">light_mode</span>
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="material-symbols-outlined text-xl text-foreground">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  )
}
