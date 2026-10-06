'use client'

import { useQueryClient } from '@tanstack/react-query'
import { TermCard } from '@/components/results/TermCard'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { KeyTerm } from '@/types'

interface KeyTermsPanelProps {
  contractId: string
  terms: KeyTerm[]
  isLoading?: boolean
}

export function KeyTermsPanel({ contractId, terms, isLoading }: KeyTermsPanelProps) {
  const queryClient = useQueryClient()

  async function handleEditTerm(termId: string, newValue: string) {
    const res = await fetch(`/api/contracts/${contractId}/terms/${termId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newValue }),
    })
    const json = await res.json()

    if (!res.ok || json.error) {
      toast.error(json.error ?? 'Failed to save edit.')
      return
    }

    // Optimistic update: refresh contract query so TermCard re-renders with new value
    await queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
    toast.success('Term updated.')
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-grey-100 bg-white p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (terms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-sm font-medium text-grey-700">No key terms extracted</p>
        <p className="mt-1 text-xs text-grey-400">
          The AI may not have found standard terms in this document.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {terms.map((term) => (
        <TermCard key={term.id} term={term} onEdit={handleEditTerm} />
      ))}
    </div>
  )
}
