/**
 * Normalize a user-typed external link into an absolute `http(s)` URL.
 *
 * Without a scheme the browser treats `pinterest.com` as a *relative* path and
 * resolves it against the app origin (e.g. `/qc-tool/pinterest.com`), so a bare
 * hostname must be upgraded to `https://` before it is ever used as an `href`.
 *
 * Returns `null` when the value cannot be a real external link — callers should
 * render such entries as plain text rather than a broken anchor.
 */
export function normalizeExternalUrl(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return null

  // Protocol-relative (`//example.com`) and scheme-less values both need https.
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (!url.hostname.includes(".")) return null
    return url.toString()
  } catch {
    return null
  }
}
