'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge'
import { usePageNavigation } from '@/hooks/usePageNavigation'
import { cn } from '@/lib/utils/cn'
import type { KeyTerm } from '@/types'

interface TermCardProps {
  term: KeyTerm
  onEdit: (termId: string, newValue: string) => Promise<void>
}

export function TermCard({ term, onEdit }: TermCardProps) {
  const { navigateToPage } = usePageNavigation()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(term.value)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleSave() {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === term.value) {
      setEditing(false)
      return
    }
    setSaving(true)
    await onEdit(term.id, trimmed)
    setSaving(false)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditValue(term.value)
      setEditing(false)
    }
  }

  const isLowConfidence = term.confidence_score < 0.5

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-4',
        isLowConfidence ? 'border-danger-200' : 'border-grey-100'
      )}
    >
      {/* Header row: term name + badges + confidence */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-grey-400" style={{ letterSpacing: 0 }}>
              {term.term_name.toUpperCase()}
            </span>
            {term.is_custom && (
              <Badge variant="custom" className="text-[10px] px-1.5 py-0">Custom</Badge>
            )}
            {term.is_edited && (
              <Badge variant="edited" className="text-[10px] px-1.5 py-0">Edited</Badge>
            )}
          </div>

          {/* Value — editable */}
          {editing ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                className="flex-1 rounded-md border border-brand px-2 py-1.5 text-sm text-grey-900 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1 disabled:opacity-50"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                disabled={saving}
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="shrink-0 text-xs font-medium text-brand hover:text-brand-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditValue(term.value); setEditing(false) }}
                className="shrink-0 text-xs text-grey-400 hover:text-grey-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setEditValue(term.value); setEditing(true) }}
              className="mt-1.5 w-full text-left text-sm font-medium text-grey-900 hover:text-brand transition-colors group"
              title="Click to edit"
            >
              {term.value}
              <span className="ml-1.5 text-[10px] text-grey-300 opacity-0 group-hover:opacity-100 transition-opacity">
                edit
              </span>
            </button>
          )}
        </div>

        {/* Right column: confidence + page */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <ConfidenceBadge score={term.confidence_score} />
          <button
            onClick={() => navigateToPage(term.page_number)}
            className="text-xs text-grey-400 hover:text-brand transition-colors font-medium"
            title={`Jump to page ${term.page_number}`}
          >
            p.{term.page_number}
          </button>
        </div>
      </div>

      {/* Low-confidence warning */}
      {isLowConfidence && (
        <p
          role="alert"
          className="mt-2.5 rounded bg-warning-50 border border-warning-200 px-3 py-1.5 text-xs text-warning-700 leading-relaxed"
        >
          Low confidence — verify this term directly in the document.
        </p>
      )}

      {/* Source sentence toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2.5 text-xs text-grey-400 hover:text-grey-700 transition-colors"
        aria-expanded={expanded}
      >
        {expanded ? 'Hide source ↑' : 'Why? ↓'}
      </button>

      {expanded && (
        <blockquote className="mt-2 rounded bg-grey-25 border-l-2 border-grey-200 px-3 py-2 text-xs italic text-grey-500 leading-relaxed">
          &ldquo;{term.source_sentence}&rdquo;
        </blockquote>
      )}
    </div>
  )
}
