/** App subpath on revuesuite.com — must match `basePath` in next.config.ts */
export const APP_BASE_PATH = "/QC-Tool"

/** Prefix an app route or API path with the configured basePath. */
export function withBasePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`

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

/** Path for files in `public/` (not auto-prefixed on raw `<img>` tags). */
export function publicPath(path: string): string {
  return withBasePath(path)
}

/** Path for Route Handlers under `src/app/api`. */
export function apiPath(path: string): string {
  return withBasePath(path.startsWith("/") ? path : `/${path}`)
}
