import { cn } from '@/lib/utils/cn'

interface ConfidenceBadgeProps {
  score: number
  className?: string
}

export function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  const pct = Math.round(score * 100)

  const level = score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low'

  const styles = {
    high: 'bg-success-50 text-success-700 border-success-100',
    medium: 'bg-warning-50 text-warning-600 border-warning-100',
    low: 'bg-danger-50 text-danger-600 border-danger-100',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        styles[level],
        className
      )}
      title={`Confidence: ${pct}%`}
    >
      {level === 'low' && <span aria-label="Low confidence warning">⚠️</span>}
      {pct}%
    </span>
  )
}
