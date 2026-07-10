import { publicPath } from "@/lib/base-path"

/**
 * Brand animation for the auth + onboarding screens.
 *
 * Served from `public/` — never a remote host. The previous lottie.host URL
 * started returning 403 and broke every screen that embedded it.
 * `encodeURI` is required because the filename contains a space.
 */
export const BRAND_LOTTIE = encodeURI(publicPath("/assets/Remote worker.json"))
