'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PDFViewer } from '@/components/results/PDFViewer'
import { TextViewerFallback } from '@/components/results/TextViewerFallback'
import { KeyTermsPanel } from '@/components/results/KeyTermsPanel'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { FeedbackWidget } from '@/components/shared/FeedbackWidget'
import { LegalDisclaimer } from '@/components/shared/LegalDisclaimer'
import { usePageNavigation } from '@/hooks/usePageNavigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Contract, KeyTerm } from '@/types'

type ContractWithTerms = Contract & { key_terms: KeyTerm[] }

async function fetchContractWithTerms(id: string): Promise<ContractWithTerms> {
  const res = await fetch(`/api/contracts/${id}`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Failed to load contract')
  return json.data.contract as ContractWithTerms
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header skeleton */}
      <div className="border-b border-grey-100 bg-white px-6 py-4 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-72" />
      </div>
      {/* Body skeleton */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-grey-50 p-4">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        <div className="w-96 border-l border-grey-100 p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-grey-100 bg-white p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ContractResultsPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string

  const [activeTab, setActiveTab] = useState<'terms' | 'chat'>('terms')
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [useFallback, setUseFallback] = useState(false)
  const [viewerLoading, setViewerLoading] = useState(true)

  const { targetPage, clearTargetPage } = usePageNavigation()

  const { data: contract, isLoading, error } = useQuery<ContractWithTerms>({
    queryKey: ['contract', contractId],
    queryFn: () => fetchContractWithTerms(contractId),
    retry: 1,
    // Poll if contract is still processing
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'processing' || status === 'pending' ? 3000 : false
    },
  })

  // Fetch signed URL for PDF viewer
  useEffect(() => {
    async function fetchSignedUrl() {
      setViewerLoading(true)
      try {
        const res = await fetch(`/api/contracts/${contractId}/signed-url`)
        const json = await res.json()
        if (res.ok && json.data?.signedUrl) {
          setSignedUrl(json.data.signedUrl)
        } else {
          setUseFallback(true)
        }
      } catch {
        setUseFallback(true)
      } finally {
        setViewerLoading(false)
      }
    }
    fetchSignedUrl()
  }, [contractId])

  if (isLoading) return <ResultsSkeleton />

  if (error || !contract) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-57px)] gap-4">
        <p className="text-sm font-medium text-grey-700">Failed to load contract</p>
        <p className="text-xs text-grey-400">Check your connection and try again.</p>
        <div className="flex gap-3">
          <button
            onClick={() => router.refresh()}
            className="rounded-md border border-grey-200 px-4 py-2 text-sm text-grey-700 hover:bg-grey-50 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="rounded-md bg-brand px-4 py-2 text-sm text-white hover:bg-brand-700 transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Still processing
  if (contract.status === 'processing' || contract.status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-57px)] gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand" />
        <p className="text-sm font-medium text-grey-700">
          {contract.status === 'pending' ? 'Preparing to analyse…' : 'Analysing your contract…'}
        </p>
        <p className="text-xs text-grey-400">This takes up to 30 seconds.</p>
      </div>
    )
  }

  // Error status
  if (contract.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-57px)] gap-4">
        <p className="text-sm font-medium text-grey-700">Analysis failed</p>
        <p className="text-xs text-grey-400 max-w-xs text-center">
          Our AI encountered an error processing this contract. You can go back and try uploading again.
        </p>
        <Link
          href="/dashboard"
          className="rounded-md bg-brand px-4 py-2 text-sm text-white hover:bg-brand-700 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  const terms = contract.key_terms ?? []
  const lowConfidenceCount = terms.filter((t) => t.confidence_score < 0.5).length

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Page header */}
      <div className="border-b border-grey-100 bg-white px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="shrink-0 rounded p-1 text-grey-400 hover:text-grey-700 hover:bg-grey-50 transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1
              className="font-semibold text-grey-900 truncate"
              style={{ fontSize: 15, letterSpacing: 0 }}
              title={contract.name}
            >
              {contract.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                {contract.type}
              </Badge>
              <span className="text-xs text-grey-400">{contract.page_count} pages</span>
              {lowConfidenceCount > 0 && (
                <span className="text-xs text-warning-600">
                  ⚠️ {lowConfidenceCount} low confidence
                </span>
              )}
            </div>
          </div>
        </div>
        <LegalDisclaimer className="shrink-0 hidden md:block max-w-sm" />
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: PDF viewer or text fallback */}
        <div className="flex-1 overflow-hidden border-r border-grey-100 flex flex-col">
          {viewerLoading ? (
            <div className="flex-1 bg-grey-50 p-4">
              <Skeleton className="h-full w-full rounded-lg" />
            </div>
          ) : useFallback || !signedUrl ? (
            <TextViewerFallback
              contractText={contract.contract_text}
              targetPage={targetPage}
              onClearTarget={clearTargetPage}
            />
          ) : (
            <PDFViewer
              signedUrl={signedUrl}
              targetPage={targetPage}
              onClearTarget={clearTargetPage}
            />
          )}
        </div>

        {/* Right: Tabs — Key Terms / Chat + Feedback */}
        <div className="w-[400px] shrink-0 flex flex-col overflow-hidden bg-white">
          {/* Tab bar */}
          <div className="flex border-b border-grey-100 shrink-0">
            {(['terms', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-brand text-brand'
                    : 'text-grey-400 hover:text-grey-700'
                }`}
                style={{ letterSpacing: 0 }}
              >
                {tab === 'terms' ? `Key Terms (${terms.length})` : 'Chat'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'terms' && (
              <>
                <KeyTermsPanel
                  contractId={contractId}
                  terms={terms}
                  isLoading={false}
                />
                <FeedbackWidget contractId={contractId} />
              </>
            )}
            {activeTab === 'chat' && (
              <ChatInterface contractId={contractId} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
