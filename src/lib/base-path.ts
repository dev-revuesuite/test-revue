/** App subpath on revuesuite.com — must match `basePath` in next.config.ts (Vercel lowercases path domains). */
export const APP_BASE_PATH = "/qc-tool"

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

/** Build an absolute redirect URL for Route Handlers (OAuth callback, etc.). */
export function absoluteAppUrl(origin: string, path: string): string {
  return `${origin}${withBasePath(appRoute(path))}`
}

/** Path for files in `public/` (not auto-prefixed on raw `<img>` tags). */
export function publicPath(path: string): string {
  return withBasePath(path)
}

/** Path for Route Handlers under `src/app/api`. */
export function apiPath(path: string): string {
  return withBasePath(path.startsWith("/") ? path : `/${path}`)
}
