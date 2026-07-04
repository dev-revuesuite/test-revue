/** App subpath on revuesuite.com — must match `basePath` in next.config.ts (Vercel lowercases path domains). */
export const APP_BASE_PATH = "/qc-tool"

/** Public production origin for auth emails and canonical redirects. */
export const CANONICAL_APP_ORIGIN = "https://revuesuite.com"
export const CANONICAL_APP_HOST = "revuesuite.com"
export const VERCEL_PREVIEW_HOST = "test-revue.vercel.app"

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`
}

/**
 * Strip configured basePath so route checks work whether middleware receives
 * `/studio` or `/qc-tool/studio`.
 */
export function stripBasePath(pathname: string): string {
  return appRoute(pathname)
}

/**
 * Route path for Next.js navigation (adds basePath automatically):
 * - `next/link` `<Link href>`
 * - `router.push` / `router.replace`
 * - `redirect()` from `next/navigation`
 * - `request.nextUrl.clone()` then `url.pathname = …` in middleware
 *
 * Never pass the result through `withBasePath()`.
 */
export function appRoute(path: string): string {
  const normalized = normalizePath(path)

  if (!APP_BASE_PATH) {
    return normalized
  }

  if (normalized === APP_BASE_PATH) {
    return "/"
  }

  if (normalized.startsWith(`${APP_BASE_PATH}/`)) {
    const stripped = normalized.slice(APP_BASE_PATH.length)
    return stripped.length > 0 ? stripped : "/"
  }

  return normalized
}

/**
 * Full browser URL path (includes basePath). Use only when Next.js does NOT
 * prefix for you:
 * - raw `<a href="…">`
 * - `<img src>` via `publicPath()`
 * - `` `${window.location.origin}${path}` ``
 * - `` NextResponse.redirect(`${origin}${path}`) ``
 */
export function withBasePath(path: string): string {
  const normalized = normalizePath(path)

  if (!APP_BASE_PATH) {
    return normalized
  }

  if (
    normalized === APP_BASE_PATH ||
    normalized.startsWith(`${APP_BASE_PATH}/`)
  ) {
    return normalized
  }

  return `${APP_BASE_PATH}${normalized}`
}

/**
 * Canonical app origin for auth emails and callbacks.
 * Set NEXT_PUBLIC_APP_URL=https://revuesuite.com in production so reset/OAuth
 * links always use the public domain, not a Vercel preview URL.
 */
export function getConfiguredAppOrigin(fallbackOrigin?: string): string {
  const fallback =
    fallbackOrigin?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "")

  if (
    fallback.includes("localhost") ||
    fallback.includes("127.0.0.1")
  ) {
    return fallback
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "")
  if (configured) {
    return configured
  }

  if (fallback && !fallback.includes(VERCEL_PREVIEW_HOST)) {
    return fallback
  }

  return CANONICAL_APP_ORIGIN
}

/** Full URL for Supabase auth redirectTo (includes basePath). */
export function authRedirectUrl(path: string, fallbackOrigin?: string): string {
  const origin = getConfiguredAppOrigin(fallbackOrigin)
  return `${origin}${withBasePath(normalizePath(path))}`
}

/** Build an absolute redirect URL for Route Handlers (OAuth callback, etc.). */
export function absoluteAppUrl(origin: string, path: string): string {
  const resolvedOrigin = getConfiguredAppOrigin(origin) || origin
  return `${resolvedOrigin}${withBasePath(appRoute(path))}`
}

/** Path for files in `public/` (not auto-prefixed on raw `<img>` tags). */
export function publicPath(path: string): string {
  return withBasePath(path)
}

/** Path for Route Handlers under `src/app/api`. */
export function apiPath(path: string): string {
  return withBasePath(path.startsWith("/") ? path : `/${path}`)
}
