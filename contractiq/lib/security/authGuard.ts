import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AuthSuccess {
  user: User
  supabase: SupabaseClient
  error: null
}

interface AuthFailure {
  user: null
  supabase: null
  error: NextResponse
}

export type AuthResult = AuthSuccess | AuthFailure

/**
 * Verifies the request has a valid Supabase session.
 * Uses getUser() — validates the token server-side on every call.
 *
 * Usage in API routes:
 *   const auth = await requireAuth()
 *   if (auth.error) return auth.error
 *   const { user, supabase } = auth
 */
export async function requireAuth(): Promise<AuthResult> {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json(
        { data: null, error: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  return { user, supabase, error: null }
}
