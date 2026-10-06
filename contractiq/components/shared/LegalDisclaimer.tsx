import { cn } from '@/lib/utils/cn'

interface LegalDisclaimerProps {
  className?: string
}

export function LegalDisclaimer({ className }: LegalDisclaimerProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-warning-200 bg-warning-50 px-4 py-3 text-xs text-warning-600',
        className
      )}
      role="note"
      aria-label="Legal disclaimer"
    >
      <strong>Not legal advice.</strong> This is an AI-assisted review tool. Always verify critical
      terms with a qualified lawyer before signing.
    </div>
  )
}
