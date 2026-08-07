import { createClient } from "@/lib/supabase/server"
import { searchGlobal } from "@/lib/global-search-service"
import type { GlobalSearchCategory } from "@/types/global-search"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VALID_CATEGORIES: GlobalSearchCategory[] = [
  "projects",
  "clients",
  "assets",
  "team",
]

function parseCategory(value: string | null): GlobalSearchCategory {
  if (value && VALID_CATEGORIES.includes(value as GlobalSearchCategory)) {
    return value as GlobalSearchCategory
  }
  return "projects"
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = (searchParams.get("q") || "").trim()
    const category = parseCategory(searchParams.get("category"))

    if (query.length < 1) {
      return Response.json({ results: [] })
    }

    const results = await searchGlobal(supabase, user.id, query, category)

    return Response.json({ results })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Search failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
