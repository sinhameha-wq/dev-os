import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit } from '@/lib/security/rateLimiter'
import { parseBody, processBodySchema } from '@/lib/security/inputValidator'
import { extractKeyTerms } from '@/lib/openai/extraction'
import { withRetry } from '@/lib/utils/retry'
import type { ApiResponse, ContractType } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Auth
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  // 2. Rate limit — 5 analyses per hour
  const rateLimitResponse = await checkRateLimit(user.id, 'process')
  if (rateLimitResponse) return rateLimitResponse

  // 3. Validate body with Zod
  let rawBody: unknown = {}
  try {
    rawBody = await request.json()
  } catch {
    rawBody = {}
  }

  const bodyResult = parseBody(processBodySchema, rawBody)
  if (bodyResult.error) return bodyResult.error
  const { customTerms } = bodyResult.data

  // 4. Verify contract ownership + status
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, contract_text, type, status')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (contractError || !contract) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Contract not found.' },
      { status: 404 }
    )
  }

  if (contract.status !== 'pending') {
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: `This contract cannot be processed (status: ${contract.status as string}).`,
      },
      { status: 409 }
    )
  }

  // 5. Mark as processing
  await supabase.from('contracts').update({ status: 'processing' }).eq('id', params.id)

  // 6. Run extraction
  try {
    const terms = await withRetry(
      () =>
        extractKeyTerms(
          contract.contract_text as string,
          contract.type as ContractType,
          customTerms
        ),
      { maxAttempts: 3, baseDelayMs: 1000 }
    )

    const { data: insertedTerms, error: insertError } = await supabase
      .from('key_terms')
      .insert(
        terms.map((t) => ({
          contract_id: params.id,
          user_id: user.id,
          term_name: t.termName,
          value: t.value,
          page_number: t.pageNumber,
          confidence_score: t.confidenceScore,
          source_sentence: t.sourceSentence,
          is_custom: t.isCustom,
          is_edited: false,
          original_value: null,
        }))
      )
      .select()

    if (insertError) {
      await supabase.from('contracts').update({ status: 'error' }).eq('id', params.id)
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to save extracted terms.' },
        { status: 500 }
      )
    }

    await supabase.from('contracts').update({ status: 'complete' }).eq('id', params.id)

    return NextResponse.json({ data: { terms: insertedTerms }, error: null })
  } catch {
    // Catch block intentionally omits the error object — never leak internal details
    await supabase.from('contracts').update({ status: 'error' }).eq('id', params.id)
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: 'Our AI is temporarily unavailable. Please try again in a few minutes.',
      },
      { status: 503 }
    )
  }
}
