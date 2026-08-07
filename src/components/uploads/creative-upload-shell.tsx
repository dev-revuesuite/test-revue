"use client"

import { Suspense, type ReactNode } from "react"

import { AiAnalysisProvider } from "@/contexts/ai-analysis-context"
import { CreativeUploadProvider } from "@/contexts/creative-upload-context"
import { AnalysisCompletionToast } from "@/components/ai-analysis/analysis-completion-toast"
import { AnalysisTray } from "@/components/ai-analysis/analysis-tray"
import { UploadTray } from "@/components/uploads/upload-tray"

export function CreativeUploadShell({ children }: { children: ReactNode }) {
  return (
    <CreativeUploadProvider>
      <AiAnalysisProvider>
        {children}
        {/* Shared bottom-right corner: background-work trays stack here. */}
        <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(100vw-2rem,22rem)] flex-col gap-3">
          <AnalysisTray />
          <UploadTray />
        </div>
        <Suspense fallback={null}>
          <AnalysisCompletionToast />
        </Suspense>
      </AiAnalysisProvider>
    </CreativeUploadProvider>
  )
}
