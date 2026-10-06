'use client'

import { useCallback } from 'react'
import { useContractStore } from '@/hooks/useContractStore'

export function usePageNavigation() {
  const { targetPage, setTargetPage } = useContractStore()

  const navigateToPage = useCallback(
    (page: number) => {
      setTargetPage(page)
    },
    [setTargetPage]
  )

  const clearTargetPage = useCallback(() => {
    setTargetPage(null)
  }, [setTargetPage])

  return { targetPage, navigateToPage, clearTargetPage }
}
