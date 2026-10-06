import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, ContractListItem, DashboardStats } from '@/types'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sort = searchParams.get('sort') ?? 'date'
  const order = searchParams.get('order') ?? 'desc'

  const column = sort === 'name' ? 'name' : sort === 'type' ? 'type' : 'created_at'

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('id, name, type, status, page_count, created_at')
    .eq('user_id', user.id)
    .order(column, { ascending: order === 'asc' })

  if (error) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: error.message }, { status: 500 })
  }

  const list = (contracts ?? []) as ContractListItem[]
  const stats: DashboardStats = {
    total: list.length,
    nda: list.filter((c) => c.type === 'NDA').length,
    msa: list.filter((c) => c.type === 'MSA').length,
  }

  return NextResponse.json({ data: { contracts: list, stats }, error: null })
}
