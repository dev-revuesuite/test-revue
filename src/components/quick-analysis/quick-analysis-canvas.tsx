"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MediaType } from "@/lib/media-type"
import type {
  AIAnalysisType,
  AISuggestion,
  AiAnalysisEmptyResult,
} from "@/components/communication/comments-panel"
import type { ClientAnalysisImageInput } from "@/lib/ai-analysis-client-image"
import { captureCreativeMediaForAnalysis } from "@/lib/capture-creative-media"
import { apiPath } from "@/lib/base-path"
import { downloadCreativeInBrowser } from "@/lib/download-creative-client"
import {
  downloadCreativeWithAiBoxesInBrowser,
  filterExportableAiSuggestions,
} from "@/lib/export-creative-with-ai-boxes"
import type { PdfPageViewerReadyPayload } from "@/components/communication/pdf-page-viewer"
import { CanvasArea } from "@/components/communication/canvas-area"
import { CommunicationSidebar } from "@/components/communication/communication-sidebar"
import { CommentsPanel } from "@/components/communication/comments-panel"
import { ZoomControls } from "@/components/communication/zoom-controls"
import { PdfPagePager } from "@/components/communication/pdf-page-pager"
import { QuickAnalysisHeader } from "@/components/quick-analysis/quick-analysis-header"

function aiSuggestionPageNumber(s: AISuggestion): number {
  return s.pageNumber ?? 1
}

interface QuickAnalysisCanvasProps {
  analysisId: string
  fileName: string
  mediaType: MediaType
  pageCount: number | null
  fileUrl: string
  initialSuggestions: AISuggestion[]
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function QuickAnalysisCanvas({
  analysisId,
  fileName,
  mediaType,
  pageCount: initialPageCount,
  fileUrl,
  initialSuggestions,
  user,
}: QuickAnalysisCanvasProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>(initialSuggestions)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageCount, setPageCount] = useState(
    Math.max(1, initialPageCount ?? 1)
  )
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [aiAnalysisActive, setAiAnalysisActive] = useState(false)
  const [aiAnalysisEmptyResult, setAiAnalysisEmptyResult] =
    useState<AiAnalysisEmptyResult | null>(null)
  const [showAIAnalysisOptions, setShowAIAnalysisOptions] = useState(false)
  const [overlaysPeekHidden, setOverlaysPeekHidden] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: "info" | "error" } | null>(
    null
  )
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isPdf = mediaType === "pdf"
  const effectivePageCount = Math.max(1, pageCount)

  const showToast = useCallback(
    (message: string, tone: "info" | "error" = "info") => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setToast({ message, tone })
      toastTimerRef.current = setTimeout(() => setToast(null), 3200)
    },
    []
  )

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!overlaysPeekHidden) return

    const endPeek = () => setOverlaysPeekHidden(false)
    window.addEventListener("pointerup", endPeek)
    window.addEventListener("pointercancel", endPeek)
    return () => {
      window.removeEventListener("pointerup", endPeek)
      window.removeEventListener("pointercancel", endPeek)
    }
  }, [overlaysPeekHidden])

  useEffect(() => {
    if (currentPage > effectivePageCount) {
      setCurrentPage(effectivePageCount)
    }
  }, [currentPage, effectivePageCount])

  useEffect(() => {
    setAiAnalysisEmptyResult(null)
  }, [currentPage])

  const pageFilteredSuggestions = useMemo(
    () =>
      isPdf
        ? suggestions.filter((s) => aiSuggestionPageNumber(s) === currentPage)
        : suggestions,
    [suggestions, isPdf, currentPage]
  )

  const exportableAiSuggestions = useMemo(
    () => filterExportableAiSuggestions(pageFilteredSuggestions),
    [pageFilteredSuggestions]
  )

  const handlePdfDocumentReady = useCallback(
    ({ pageCount: detectedPageCount }: PdfPageViewerReadyPayload) => {
      setPageCount(Math.max(1, detectedPageCount))
    },
    []
  )

  const handleStartAnalysis = useCallback(
    async (type: AIAnalysisType) => {
      if (type !== "spacing" && type !== "spelling" && type !== "lineheight") {
        return
      }

      let clientImage: ClientAnalysisImageInput | undefined

      if (isPdf) {
        const captured = await captureCreativeMediaForAnalysis(
          "primary",
          currentPage
        )
        if (!captured.ok) {
          showToast(captured.error, "error")
          return
        }
        clientImage = captured.capture
      }

      setAiAnalysisEmptyResult(null)
      setAiAnalysisActive(true)

      try {
        const response = await fetch(
          apiPath(`/api/quick-analysis/${analysisId}/analyze`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analysisType: type,
              pageNumber: currentPage,
              ...(clientImage ? { clientImage } : {}),
            }),
          }
        )

        const payload = (await response.json()) as {
          suggestions?: AISuggestion[]
          empty?: boolean
          pageNumber?: number
          analysisType?: AIAnalysisType
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error || "AI analysis failed")
        }

        const resultPage = payload.pageNumber ?? currentPage
        const resultType = payload.analysisType ?? type
        const newSuggestions = payload.suggestions ?? []

        setSuggestions((prev) => {
          const retained = prev.filter(
            (suggestion) =>
              !(
                aiSuggestionPageNumber(suggestion) === resultPage &&
                suggestion.type === resultType
              )
          )
          return [...retained, ...newSuggestions]
        })

        const isEmpty = payload.empty ?? newSuggestions.length === 0
        if (isEmpty) {
          setAiAnalysisEmptyResult({
            analysisType: resultType,
            pageNumber: resultPage,
          })
        } else {
          setAiAnalysisEmptyResult(null)
        }
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "AI analysis failed",
          "error"
        )
      } finally {
        setAiAnalysisActive(false)
      }
    },
    [analysisId, currentPage, isPdf, showToast]
  )

  const handleIgnoreSuggestion = useCallback(
    async (id: string) => {
      let removed: AISuggestion | undefined

      setSuggestions((prev) => {
        removed = prev.find((suggestion) => suggestion.id === id)
        return prev.filter((suggestion) => suggestion.id !== id)
      })

      try {
        const response = await fetch(
          apiPath(`/api/quick-analysis/suggestions/${id}/ignore`),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ignored: true }),
          }
        )

        const payload = (await response.json()) as { error?: string }
        if (!response.ok) {
          throw new Error(payload.error || "Failed to ignore suggestion")
        }
      } catch (error) {
        if (removed) {
          setSuggestions((prev) => [...prev, removed!])
        }
        showToast(
          error instanceof Error ? error.message : "Failed to ignore suggestion",
          "error"
        )
      }
    },
    [showToast]
  )

  const handleDownload = useCallback(
    async (mode: "original" | "with-ai-boxes") => {
      if (!fileUrl) {
        showToast("No file available to download", "error")
        return
      }

      try {
        if (mode === "original") {
          await downloadCreativeInBrowser(fileUrl, {
            creativeName: fileName.replace(/\.[^.]+$/, ""),
            mediaType,
          })
          return
        }

        if (exportableAiSuggestions.length === 0) {
          showToast("No AI boxes available to export", "error")
          return
        }

        await downloadCreativeWithAiBoxesInBrowser({
          imageUrl: fileUrl,
          mediaType,
          creativeName: fileName.replace(/\.[^.]+$/, ""),
          currentPage,
          aiSuggestions: pageFilteredSuggestions,
        })
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Failed to download file",
          "error"
        )
      }
    },
    [
      fileUrl,
      fileName,
      mediaType,
      currentPage,
      exportableAiSuggestions.length,
      pageFilteredSuggestions,
      showToast,
    ]
  )

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 5, 200))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 5, 10))
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f5f5f5] dark:bg-[#1a1a1a]">
      <CanvasArea
        zoom={zoom}
        selectedTool="pointer"
        imageUrl={fileUrl}
        mediaType={mediaType}
        currentPage={currentPage}
        pageCount={pageCount}
        onPdfDocumentReady={handlePdfDocumentReady}
        onZoomChange={setZoom}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
        aiAnalysisActive={aiAnalysisActive}
        viewMode="ai"
        aiSuggestions={pageFilteredSuggestions}
        canRunAiAnalysis={false}
        overlaysPeekHidden={overlaysPeekHidden}
      />

      {!isFullscreen && (
        <QuickAnalysisHeader
          fileName={fileName}
          onDownload={handleDownload}
          downloadDisabled={!fileUrl}
          downloadWithAiBoxesDisabled={exportableAiSuggestions.length === 0}
          user={user}
        />
      )}

      {!isFullscreen && (
        <CommunicationSidebar
          selectedTool="pointer"
          onSelectTool={() => {}}
          onStartAIAnalysis={handleStartAnalysis}
          aiAnalysisActive={aiAnalysisActive}
          viewMode="ai"
          showAIOptions={showAIAnalysisOptions}
          onShowAIOptionsChange={setShowAIAnalysisOptions}
          canRunAiAnalysis
          aiOnlyMode
          isPdfCreative={isPdf}
          currentPage={currentPage}
          pageCount={effectivePageCount}
          overlaysPeekHidden={overlaysPeekHidden}
          onPeekOverlaysStart={() => setOverlaysPeekHidden(true)}
        />
      )}

      {!isFullscreen && (
        <CommentsPanel
          viewMode="ai"
          aiSuggestions={suggestions}
          aiAnalysisEmptyResult={aiAnalysisEmptyResult}
          onIgnoreAISuggestion={handleIgnoreSuggestion}
          showPageLabels={isPdf && effectivePageCount > 1}
        />
      )}

      {isPdf && effectivePageCount > 1 && !isFullscreen && (
        <div className="pointer-events-auto fixed bottom-16 right-[324px] z-50 lg:right-[364px] xl:right-[404px]">
          <PdfPagePager
            currentPage={currentPage}
            pageCount={effectivePageCount}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomChange={setZoom}
        onToggleFullscreen={handleToggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {toast && (
        <div className="fixed bottom-6 left-6 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-xl",
              toast.tone === "error"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
                : "border-gray-200 bg-white text-gray-800 dark:border-[#444] dark:bg-[#2a2a2a] dark:text-gray-100"
            )}
            role="status"
          >
            <span
              className={cn(
                "inline-flex h-2 w-2 shrink-0 rounded-full",
                toast.tone === "error" ? "bg-red-500" : "bg-emerald-500"
              )}
            />
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
