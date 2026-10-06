import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; termId: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { value?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.value || typeof body.value !== 'string' || !body.value.trim()) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'value is required.' }, { status: 400 })
  }

  const { data: term, error: fetchError } = await supabase
    .from('key_terms')
    .select('id, value, is_edited, user_id')
    .eq('id', params.termId)
    .eq('contract_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !term) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Term not found.' }, { status: 404 })
  }

  const updatePayload: Record<string, unknown> = {
    value: (body.value as string).trim(),
    is_edited: true,
  }

  if (!term.is_edited) {
    updatePayload.original_value = term.value
  }

  const { data: updated, error: updateError } = await supabase
    .from('key_terms')
    .update(updatePayload)
    .eq('id', params.termId)
    .select()
    .single()

  if (updateError || !updated) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Failed to update term.' }, { status: 500 })
  }

  return NextResponse.json({ data: { term: updated }, error: null })
}
