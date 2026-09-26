import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parsePlatformDeveloperUserIds(): Set<string> {
  const raw = process.env.PLATFORM_DEVELOPER_USER_IDS?.trim()
  if (!raw) return new Set()

  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => UUID_RE.test(id))
  )
}

export function isPlatformDeveloper(userId: string): boolean {
  return parsePlatformDeveloperUserIds().has(userId)
}

export async function requirePlatformDeveloper(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new PlatformDeveloperAccessError("Unauthorized", 401)
  }

  if (!isPlatformDeveloper(user.id)) {
    throw new PlatformDeveloperAccessError("Forbidden", 403)
  }

  return user
}

export class PlatformDeveloperAccessError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "PlatformDeveloperAccessError"
  }
}
