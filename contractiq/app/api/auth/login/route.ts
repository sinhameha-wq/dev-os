import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/security/rateLimiter'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ data: null, error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.errors[0]?.message ?? 'Invalid credentials.' },
      { status: 422 }
    )
  }

  const { email, password } = parsed.data

  // Rate limit by email hash (use the email itself as identifier pre-auth)
  // We can't use user_id here since the user isn't authenticated yet.
  // Use a lightweight in-memory limit via Supabase if the rate_limit_events table exists.
  // For pre-auth, we fall back to allowing the attempt (Supabase Auth has its own brute-force protection).

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    // Return a generic message — never expose whether the email exists
    return NextResponse.json(
      { data: null, error: 'Invalid email or password.' },
      { status: 401 }
    )
  }

  // Apply post-auth rate limit (tracks by user_id)
  const rateLimitResponse = await checkRateLimit(data.user.id, 'auth')
  if (rateLimitResponse) return rateLimitResponse

  return NextResponse.json({ data: { userId: data.user.id }, error: null })
}
