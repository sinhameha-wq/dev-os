'use client'

import { useEffect, useRef } from 'react'

interface TextViewerFallbackProps {
  contractText: string
  targetPage: number | null
  onClearTarget: () => void
}

interface ParsedPage {
  pageNum: number
  content: string
}

function parsePages(contractText: string): ParsedPage[] {
  // Split on [PAGE N] markers, keeping the page numbers
  const parts = contractText.split(/\[PAGE (\d+)\]/)
  const pages: ParsedPage[] = []

  for (let i = 1; i < parts.length; i += 2) {
    const pageNum = parseInt(parts[i], 10)
    const content = (parts[i + 1] ?? '').trim()
    if (!isNaN(pageNum) && content) {
      pages.push({ pageNum, content })
    }
  }

  return pages
}

export function TextViewerFallback({
  contractText,
  targetPage,
  onClearTarget,
}: TextViewerFallbackProps) {
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map())
  const pages = parsePages(contractText)

  const setPageRef = (pageNum: number) => (el: HTMLElement | null) => {
    if (el) pageRefs.current.set(pageNum, el)
    else pageRefs.current.delete(pageNum)
  }

  useEffect(() => {
    if (!targetPage) return
    const el = pageRefs.current.get(targetPage)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      onClearTarget()
    }
  }, [targetPage, onClearTarget])

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="text-sm text-grey-400">No text content available for preview.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Banner */}
      <div className="border-b border-grey-100 bg-warning-50 px-4 py-2 shrink-0">
        <p className="text-xs text-warning-700">
          PDF viewer unavailable — showing extracted text. Key term navigation still works.
        </p>
      </div>

      {/* Pages */}
      <div className="flex-1 overflow-y-auto bg-grey-50 p-4 space-y-4">
        {pages.map(({ pageNum, content }) => (
          <section
            key={pageNum}
            id={`page-${pageNum}`}
            ref={setPageRef(pageNum) as (el: HTMLElement | null) => void}
            className="rounded-lg border border-grey-100 bg-white p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-grey-400">PAGE {pageNum}</span>
              <div className="flex-1 h-px bg-grey-100" />
            </div>
            <p className="text-sm text-grey-700 leading-relaxed whitespace-pre-wrap font-mono">
              {content}
            </p>
          </section>
        ))}
      </div>
    </div>
  )
}
