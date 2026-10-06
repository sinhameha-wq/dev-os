'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ContractListItem, ContractStatus, ContractType } from '@/types'

interface ContractTableProps {
  contracts: ContractListItem[]
}

type SortKey = 'date' | 'name' | 'type'

function StatusPill({ status }: { status: ContractStatus }) {
  const config: Record<ContractStatus, { label: string; className: string }> = {
    complete: {
      label: 'Complete',
      className: 'bg-success-50 text-success-700 border-success-100',
    },
    processing: {
      label: 'Processing',
      className: 'bg-brand-50 text-brand border-brand-100',
    },
    pending: {
      label: 'Pending',
      className: 'bg-grey-50 text-grey-500 border-grey-200',
    },
    error: {
      label: 'Error',
      className: 'bg-danger-50 text-danger border-danger-100',
    },
  }

  const { label, className } = config[status] ?? config.pending

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      {label}
    </span>
  )
}

function TypeBadge({ type }: { type: ContractType }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-brand-100 bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand">
      {type}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ContractTable({ contracts }: ContractTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSort = (searchParams.get('sort') as SortKey) ?? 'date'
  const currentOrder = searchParams.get('order') ?? 'desc'

  function handleSort(key: SortKey) {
    const params = new URLSearchParams(searchParams.toString())
    if (currentSort === key) {
      params.set('order', currentOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sort', key)
      params.set('order', 'desc')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  // Sort contracts client-side based on URL params
  const sorted = [...contracts].sort((a, b) => {
    let cmp = 0
    if (currentSort === 'name') cmp = a.name.localeCompare(b.name)
    else if (currentSort === 'type') cmp = a.type.localeCompare(b.type)
    else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return currentOrder === 'asc' ? cmp : -cmp
  })

  function SortIcon({ colKey }: { colKey: SortKey }) {
    if (currentSort !== colKey) return <ArrowUpDown size={12} className="opacity-40" />
    return currentOrder === 'asc'
      ? <ArrowUp size={12} className="text-brand" />
      : <ArrowDown size={12} className="text-brand" />
  }

  const columns: { key: SortKey; label: string; sortable: boolean }[] = [
    { key: 'name', label: 'Contract', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
  ]

  return (
    <div className="overflow-hidden rounded-lg border border-grey-100 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-grey-100 bg-grey-25">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-5 py-3 text-left text-xs font-semibold text-grey-400"
                style={{ letterSpacing: 0 }}
              >
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1.5 hover:text-grey-700 transition-colors"
                  >
                    {col.label}
                    <SortIcon colKey={col.key} />
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            <th className="px-5 py-3 text-left text-xs font-semibold text-grey-400">Pages</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-grey-400">Status</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-50">
          {sorted.map((contract) => (
            <tr
              key={contract.id}
              onClick={() => router.push(`/contracts/${contract.id}`)}
              className="cursor-pointer hover:bg-grey-25 transition-colors"
            >
              <td className="px-5 py-3.5 font-medium text-grey-900 max-w-xs">
                <span className="block truncate">{contract.name}</span>
              </td>
              <td className="px-5 py-3.5">
                <TypeBadge type={contract.type} />
              </td>
              <td className="px-5 py-3.5 text-grey-500 text-xs">
                {formatDate(contract.created_at)}
              </td>
              <td className="px-5 py-3.5 text-grey-500 text-xs tabular-nums">
                {contract.page_count}
              </td>
              <td className="px-5 py-3.5">
                <StatusPill status={contract.status} />
              </td>
              <td className="px-5 py-3.5 text-right">
                <Link
                  href={`/contracts/${contract.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-medium text-brand hover:text-brand-700 transition-colors"
                >
                  Open →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
