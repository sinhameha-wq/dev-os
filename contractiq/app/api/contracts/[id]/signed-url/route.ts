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

  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, file_path')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (contractError || !contract) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Contract not found.' }, { status: 404 })
  }

  if (!contract.file_path) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'PDF not available.' }, { status: 404 })
  }

  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from('contracts')
    .createSignedUrl(contract.file_path as string, 3600)

  if (urlError || !signedUrlData) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Failed to generate PDF URL.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { signedUrl: signedUrlData.signedUrl }, error: null })
}
