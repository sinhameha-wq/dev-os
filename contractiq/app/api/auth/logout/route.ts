import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  // Sign out clears the session and rotates the refresh token server-side
  await supabase.auth.signOut()
  return NextResponse.json({ data: null, error: null })
}
