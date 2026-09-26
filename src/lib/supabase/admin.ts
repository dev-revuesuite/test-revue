import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js"

let adminClient: SupabaseClient | null = null

/** Server-only Supabase client with service role (bypasses RLS). */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin client is not configured")
  }

  if (!adminClient) {
    adminClient = createSupabaseClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  return adminClient
}

export function isAdminClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
}
