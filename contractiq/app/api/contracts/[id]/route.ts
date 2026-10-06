import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: contract, error } = await supabase
    .from('contracts')
    .select('*, key_terms(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !contract) {
    const status = error?.code === 'PGRST116' ? 404 : 500
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: status === 404 ? 'Contract not found.' : (error?.message ?? 'Error loading contract.') },
      { status }
    )
  }

  return NextResponse.json({ data: { contract }, error: null })
}
