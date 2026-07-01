import type { Metadata } from "next"
import { NotFoundContent } from "@/components/not-found-content"

export const metadata: Metadata = {
  title: "404 — Page Not Found | Revue",
}

export default function NotFound() {
  return <NotFoundContent />
}
