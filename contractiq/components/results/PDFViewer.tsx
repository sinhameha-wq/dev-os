'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Skeleton } from '@/components/ui/skeleton'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Use CDN worker — avoids webpack bundling issues with Next.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PDFViewerProps {
  signedUrl: string
  targetPage: number | null
  onClearTarget: () => void
}

export function PDFViewer({ signedUrl, targetPage, onClearTarget }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [scale, setScale] = useState(1.0)
  const [loadError, setLoadError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const setPageRef = useCallback((pageNum: number) => (el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(pageNum, el)
    else pageRefs.current.delete(pageNum)
  }, [])

  // Navigate to target page when it changes
  useEffect(() => {
    if (!targetPage) return
    const el = pageRefs.current.get(targetPage)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      onClearTarget()
    }
  }, [targetPage, onClearTarget])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setLoadError(false)
  }

  function onDocumentLoadError() {
    setLoadError(true)
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-sm text-grey-500 font-medium">PDF viewer unavailable</p>
        <p className="text-xs text-grey-400 mt-1">
          The document preview could not be loaded.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-grey-100 bg-white px-4 py-2 shrink-0">
        <span className="text-xs text-grey-400">
          {numPages > 0 ? `${numPages} pages` : 'Loading…'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            disabled={scale <= 0.5}
            className="rounded p-1.5 text-grey-500 hover:bg-grey-50 hover:text-grey-900 disabled:opacity-40 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-grey-500 w-10 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.0, s + 0.25))}
            disabled={scale >= 2.0}
            className="rounded p-1.5 text-grey-500 hover:bg-grey-50 hover:text-grey-900 disabled:opacity-40 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setScale(1.0)}
            className="rounded p-1.5 text-grey-500 hover:bg-grey-50 hover:text-grey-900 transition-colors"
            title="Reset zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* PDF content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto bg-grey-50 p-4">
        <Document
          file={signedUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-96 rounded" />
              ))}
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              ref={setPageRef(pageNum)}
              className="mb-4 last:mb-0"
            >
              <div className="mb-1 text-xs text-grey-400 text-center">Page {pageNum}</div>
              <div className="shadow-sm overflow-hidden rounded">
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  renderTextLayer
                  renderAnnotationLayer
                  loading={<Skeleton className="h-96 w-full" />}
                />
              </div>
            </div>
          ))}
        </Document>
      </div>
    </div>
  )
}
