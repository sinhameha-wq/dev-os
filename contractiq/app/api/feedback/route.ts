import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { contractId?: unknown; rating?: unknown; comment?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Invalid request body.' }, { status: 400 })
  }

  const { contractId, rating, comment } = body

  if (!contractId || typeof contractId !== 'string') {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'contractId is required.' }, { status: 400 })
  }

  if (!rating || !['thumbs_up', 'thumbs_down'].includes(rating as string)) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'rating must be thumbs_up or thumbs_down.' },
      { status: 400 }
    )
  }

  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('id', contractId)
    .eq('user_id', user.id)
    .single()

  if (!contract) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Contract not found.' }, { status: 403 })
  }

  const { data: feedback, error: insertError } = await supabase
    .from('user_feedback')
    .insert({
      user_id: user.id,
      contract_id: contractId,
      rating,
      comment: comment && typeof comment === 'string' ? comment.slice(0, 1000) : null,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Failed to save feedback.' }, { status: 500 })
  }

  return NextResponse.json({ data: { feedbackId: feedback.id }, error: null }, { status: 201 })
}
