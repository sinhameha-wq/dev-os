'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AppNav() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      // Always redirect — even if the request fails the session will expire
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <nav className="border-b border-grey-100 bg-white px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-bold text-brand">ContractIQ</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/contracts/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          >
            Review a Contract
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-sm text-grey-400 hover:text-grey-700 transition-colors disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </nav>
  )
}
