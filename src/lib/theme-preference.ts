/** Apply a theme preference using the same class + localStorage contract as next-themes. */
export function applyThemePreference(theme: "light" | "dark" | "system") {
  const root = document.documentElement
  root.classList.remove("light", "dark")

  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme

  root.classList.add(resolved)
  try {
    localStorage.setItem("theme", theme)
  } catch {
    // Private browsing or blocked storage — class on <html> is enough for this session.
  }
}
