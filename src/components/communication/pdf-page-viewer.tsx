"use client"



import { useEffect, useRef, useState } from "react"

import { Download, FileText, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

import { loadPdfJs } from "@/lib/pdfjs-config"

import { openPdfDocument } from "@/lib/pdf-document-loader"

import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist"



const PAGE_CHANGE_DEBOUNCE_MS = 180



export interface PdfPageViewerReadyPayload {

  pageCount: number

}



export interface PdfPageViewerProps {

  url: string

  /** 1-based page index */

  page: number

  /** Target CSS width in pixels before parent zoom transform */

  displayWidth?: number

  onReady?: (payload: PdfPageViewerReadyPayload) => void

  onError?: (error: Error) => void

  /** Fired after a page finishes rendering (for SVG overlay layout sync). */

  onPageRendered?: () => void

  className?: string

}



export function PdfPageViewer({

  url,

  page,

  displayWidth = 420,

  onReady,

  onError,

  onPageRendered,

  className,

}: PdfPageViewerProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const renderTaskRef = useRef<RenderTask | null>(null)

  const docRef = useRef<PDFDocumentProxy | null>(null)

  const loadedUrlRef = useRef<string | null>(null)

  const reportedPageCountRef = useRef<number | null>(null)

  const onReadyRef = useRef(onReady)

  const onErrorRef = useRef(onError)

  const onPageRenderedRef = useRef(onPageRendered)



  const [loading, setLoading] = useState(true)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [renderPage, setRenderPage] = useState(page)

  const [displayedPage, setDisplayedPage] = useState(page)



  onReadyRef.current = onReady

  onErrorRef.current = onError

  onPageRenderedRef.current = onPageRendered



  // Debounce rapid page changes to avoid cancel/render thrashing

  useEffect(() => {

    if (page === renderPage) return



    setLoading(true)

    const timer = window.setTimeout(() => {

      setRenderPage(page)

    }, PAGE_CHANGE_DEBOUNCE_MS)



    return () => window.clearTimeout(timer)

  }, [page, renderPage])



  useEffect(() => {

    let cancelled = false



    const cleanupRender = () => {

      if (renderTaskRef.current) {

        try {

          renderTaskRef.current.cancel()

        } catch {

          // ignore cancel errors

        }

        renderTaskRef.current = null

      }

    }



    const cleanupDocument = () => {

      if (docRef.current) {

        void docRef.current.destroy()

        docRef.current = null

        loadedUrlRef.current = null

        reportedPageCountRef.current = null

      }

    }



    async function renderPdf() {

      if (!url) {

        setErrorMessage("No PDF URL provided")

        setLoading(false)

        return

      }



      setErrorMessage(null)

      cleanupRender()



      try {

        const pdfjs = await loadPdfJs()

        if (cancelled) return



        if (loadedUrlRef.current !== url) {

          cleanupDocument()

          const pdf = await openPdfDocument(pdfjs, url)

          if (cancelled) {

            void pdf.destroy()

            return

          }

          docRef.current = pdf

          loadedUrlRef.current = url

        }



        const pdf = docRef.current

        if (!pdf) return



        const pageCount = pdf.numPages

        if (reportedPageCountRef.current !== pageCount) {

          reportedPageCountRef.current = pageCount

          onReadyRef.current?.({ pageCount })

        }



        const safePage = Math.min(Math.max(1, renderPage), pageCount)

        const pdfPage = await pdf.getPage(safePage)

        if (cancelled) return



        const baseViewport = pdfPage.getViewport({ scale: 1 })

        const cssScale = displayWidth / baseViewport.width

        const outputScale =

          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1

        const renderScale = cssScale * outputScale

        const viewport = pdfPage.getViewport({ scale: renderScale })



        const canvas = canvasRef.current

        if (!canvas) return



        const context = canvas.getContext("2d")

        if (!context) {

          throw new Error("Could not get canvas 2d context")

        }



        canvas.width = Math.floor(viewport.width)

        canvas.height = Math.floor(viewport.height)

        canvas.style.width = `${viewport.width / outputScale}px`

        canvas.style.height = `${viewport.height / outputScale}px`



        cleanupRender()

        const task = pdfPage.render({

          canvasContext: context,

          viewport,

          canvas,

        })

        renderTaskRef.current = task

        await task.promise



        if (!cancelled) {

          setDisplayedPage(safePage)

          setLoading(false)

          onPageRenderedRef.current?.()

        }

      } catch (err) {

        if (cancelled) return

        const error =

          err instanceof Error ? err : new Error("Failed to load PDF")

        if (error.name === "RenderingCancelledException") return



        setErrorMessage(error.message || "Failed to load PDF")

        setLoading(false)

        onErrorRef.current?.(error)

      }

    }



    void renderPdf()



    return () => {

      cancelled = true

      cleanupRender()

    }

  }, [url, renderPage, displayWidth])



  useEffect(() => {

    return () => {

      if (renderTaskRef.current) {

        try {

          renderTaskRef.current.cancel()

        } catch {

          // ignore

        }

      }

      if (docRef.current) {

        void docRef.current.destroy()

        docRef.current = null

      }

    }

  }, [])



  if (errorMessage) {

    const fileName = (() => {

      try {

        const pathname = new URL(url, "http://localhost").pathname

        return pathname.split("/").pop() || "document.pdf"

      } catch {

        return "document.pdf"

      }

    })()



    return (

      <div

        className={cn(

          "flex flex-col items-center justify-center gap-3 bg-muted/50 text-muted-foreground p-8 min-h-[280px]",

          className

        )}

        role="alert"

      >

        <FileText className="w-10 h-10 opacity-50" />

        <p className="text-sm text-center max-w-xs">{errorMessage}</p>

        <div className="flex flex-wrap items-center justify-center gap-3">

          <a

            href={url}

            target="_blank"

            rel="noopener noreferrer"

            className="text-xs text-[#5C6ECD] hover:underline"

          >

            Open PDF in new tab

          </a>

          <a

            href={url}

            download={fileName}

            className="inline-flex items-center gap-1 text-xs text-[#5C6ECD] hover:underline"

          >

            <Download className="w-3.5 h-3.5" />

            Download PDF

          </a>

        </div>

      </div>

    )

  }



  return (

    <div
      className={cn("relative inline-block", className)}
      data-creative-media
      data-creative-media-ready={loading ? "false" : "true"}
      data-creative-media-page={displayedPage}
    >

      {loading && (

        <div

          className="absolute inset-0 flex items-center justify-center bg-muted/40 z-10 min-h-[200px]"

          role="status"

          aria-live="polite"

          aria-label="Loading PDF page"

        >

          <Loader2 className="w-8 h-8 animate-spin text-[#5C6ECD]" />

        </div>

      )}

      <canvas

        ref={canvasRef}

        className="max-w-none select-none block"

        aria-label={`PDF page ${displayedPage}`}

        data-creative-media

      />

    </div>

  )

}


