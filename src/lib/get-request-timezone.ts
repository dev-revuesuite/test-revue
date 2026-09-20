import { cookies } from "next/headers"

import {
  TIMEZONE_COOKIE,
  isValidTimeZone,
  resolveTimeZone,
} from "@/lib/timezone-preference"

export async function getRequestTimeZone(preference: unknown): Promise<string> {
  const store = await cookies()
  const cookieZone = store.get(TIMEZONE_COOKIE)?.value ?? null
  return resolveTimeZone(preference, cookieZone)
}
