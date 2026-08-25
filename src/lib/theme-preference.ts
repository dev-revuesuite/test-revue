/** Apply a theme preference using the same class + localStorage contract as next-themes. */
export function applyThemePreference(theme: "light" | "dark") {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(theme)
  try {
    localStorage.setItem("theme", theme)
  } catch {
    // Private browsing or blocked storage — class on <html> is enough for this session.
  }
}
