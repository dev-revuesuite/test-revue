export type GlobalSearchCategory = "projects" | "clients" | "assets" | "team"

export type GlobalSearchResultType =
  | "project"
  | "client"
  | "creative"
  | "reference"
  | "team"

export interface GlobalSearchResult {
  id: string
  type: GlobalSearchResultType
  category: GlobalSearchCategory
  title: string
  subtitle?: string
  href: string
}

export interface GlobalSearchRecentItem {
  id: string
  type: GlobalSearchResultType
  category: GlobalSearchCategory
  title: string
  subtitle?: string
  href: string
  searchedAt: number
}
