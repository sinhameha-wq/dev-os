import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ContractTable } from '@/components/dashboard/ContractTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, FileText } from 'lucide-react'
import type { ContractListItem } from '@/types'

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-grey-100 bg-white p-5">
      <p className="text-xs font-medium text-grey-400" style={{ letterSpacing: 0 }}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-grey-900 tabular-nums">{value}</p>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-grey-100 bg-white">
      <div className="border-b border-grey-100 bg-grey-25 px-5 py-3">
        <Skeleton className="h-4 w-48" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-grey-50 px-5 py-3.5 last:border-0">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-10" />
          <Skeleton className="h-4 w-20 ml-auto" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

async function DashboardContent() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: rawContracts, error } = await supabase
    .from('contracts')
    .select('id, name, type, status, page_count, created_at')
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <div className="rounded-lg border border-danger-100 bg-danger-50 px-4 py-3">
        <p className="text-sm text-danger-600">Failed to load contracts. Please refresh the page.</p>
      </div>
    )
  }

  const contracts = (rawContracts ?? []) as ContractListItem[]
  const total = contracts.length
  const ndaCount = contracts.filter((c) => c.type === 'NDA').length
  const msaCount = contracts.filter((c) => c.type === 'MSA').length

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total reviewed" value={total} />
        <StatCard label="NDAs" value={ndaCount} />
        <StatCard label="MSAs" value={msaCount} />
      </div>

      {/* Contract list */}
      {contracts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-grey-200 bg-white py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-grey-50 border border-grey-100">
            <FileText size={20} className="text-grey-300" />
          </div>
          <p className="text-sm font-medium text-grey-700">No contracts reviewed yet</p>
          <p className="mt-1 text-xs text-grey-400">Upload your first NDA or MSA to get started.</p>
          <Link
            href="/contracts/new"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} />
            Review your first contract
          </Link>
        </div>
      ) : (
        <ContractTable contracts={contracts} />
      )}
    </>
  )
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1
            className="font-medium text-grey-900"
            style={{ fontSize: 24, lineHeight: '32px', letterSpacing: 0 }}
          >
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-grey-400">Your contract review history</p>
        </div>
        <Link
          href="/contracts/new"
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          <Plus size={14} />
          Review a contract
        </Link>
      </div>

      <Suspense fallback={
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-grey-100 bg-white p-5">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
          <TableSkeleton />
        </>
      }>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
