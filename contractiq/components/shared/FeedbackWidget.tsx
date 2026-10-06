'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

interface FeedbackWidgetProps {
  contractId: string
}

type Rating = 'thumbs_up' | 'thumbs_down'

export function FeedbackWidget({ contractId }: FeedbackWidgetProps) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating || submitting) return

    setSubmitting(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          rating,
          comment: comment.trim() || undefined,
        }),
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Feedback submission failed. Please try again.')
        return
      }

      setSubmitted(true)
    } catch {
      toast.error('Feedback submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="border-t border-grey-100 px-4 py-3 bg-grey-25">
        <p className="text-xs text-success-700 font-medium">
          Thank you for your feedback.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-grey-100 px-4 py-3 bg-grey-25">
      <p className="text-xs font-medium text-grey-500 mb-2">Was this extraction accurate?</p>

      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setRating('thumbs_up')}
          disabled={submitting}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            rating === 'thumbs_up'
              ? 'border-brand bg-brand-50 text-brand'
              : 'border-grey-200 text-grey-500 hover:border-grey-300 hover:text-grey-700'
          )}
        >
          <ThumbsUp size={12} />
          Yes
        </button>
        <button
          type="button"
          onClick={() => setRating('thumbs_down')}
          disabled={submitting}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            rating === 'thumbs_down'
              ? 'border-danger bg-danger-50 text-danger'
              : 'border-grey-200 text-grey-500 hover:border-grey-300 hover:text-grey-700'
          )}
        >
          <ThumbsDown size={12} />
          Needs work
        </button>
      </div>

      {rating && (
        <>
          <div className="relative mb-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              placeholder="Optional — what could we improve?"
              disabled={submitting}
              rows={2}
              className="w-full rounded-md border border-grey-200 bg-white px-3 py-2 text-xs text-grey-900 placeholder:text-grey-300 focus:outline-none focus:ring-2 focus:ring-brand resize-none disabled:opacity-60"
              style={{ letterSpacing: 0 }}
            />
            <span
              className={cn(
                'absolute bottom-2 right-2 text-[10px] tabular-nums',
                comment.length > 950 ? 'text-warning-600' : 'text-grey-300'
              )}
            >
              {comment.length}/1000
            </span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="text-xs font-medium text-brand hover:text-brand-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
        </>
      )}
    </form>
  )
}
