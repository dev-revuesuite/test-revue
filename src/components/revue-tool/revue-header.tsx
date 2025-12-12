"use client"

import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

interface RevueHeaderProps {
  briefTitle: string
  shareLink: string
  onReUpload: () => void
}

export function RevueHeader({ briefTitle, shareLink, onReUpload }: RevueHeaderProps) {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-background border-b border-border">
      <h1 className="text-2xl font-semibold text-foreground">{briefTitle}</h1>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button variant="outline" onClick={handleCopyLink}>
          <Copy className="size-4" />
          Copy Link
        </Button>
        <Button
          className="bg-[#DBFE52] text-black hover:bg-[#c9eb42] border-2 border-border"
          onClick={onReUpload}
        >
          Re-Upload
        </Button>
      </div>
    </div>
  )
}
