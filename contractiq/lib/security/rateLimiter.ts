import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Sliding-window rate limiter backed by the rate_limit_events table.
 * Uses the service role key so users cannot read or modify their own event counts.
 */

export type RateLimitAction = 'auth' | 'upload' | 'process' | 'chat'

interface RateLimitRule {
  limit: number
  windowMs: number
  label: string
}

const RULES: Record<RateLimitAction, RateLimitRule> = {
  auth:    { limit: 10,  windowMs: 60_000,       label: '10 attempts per minute' },
  chat:    { limit: 30,  windowMs: 60_000,       label: '30 messages per minute' },
  process: { limit: 5,   windowMs: 3_600_000,    label: '5 analyses per hour' },
  upload:  { limit: 20,  windowMs: 86_400_000,   label: '20 uploads per day' },
}

/**
 * Returns null if within limit (and records the event).
 * Returns a 429 NextResponse if the limit is exceeded.
 */
export async function checkRateLimit(
  userId: string,
  action: RateLimitAction
): Promise<NextResponse | null> {
  const { limit, windowMs, label } = RULES[action]
  const windowStart = new Date(Date.now() - windowMs).toISOString()

  const supabase = createServiceClient()

  const { count, error } = await supabase
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', action)
    .gte('created_at', windowStart)

  if (error) {
    // If the table doesn't exist yet, fail open (don't block the request)
    console.error('[RateLimit] Table query failed:', error.message)
    return null
  }

  if ((count ?? 0) >= limit) {
    const retryAfterSeconds = Math.ceil(windowMs / 1000)
    return NextResponse.json(
      {
        data: null,
        error: `Rate limit exceeded (${label}). Please try again later.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      }
    )
  }

  // Record this event (fire-and-forget — don't block the response on this)
  void supabase.from('rate_limit_events').insert({ user_id: userId, action })

  return null
}
