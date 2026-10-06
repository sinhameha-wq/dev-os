import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

interface ContractForChat {
  id: string
  contract_text: string
  status: string
}

interface ChatSecurityResult {
  contract: ContractForChat | null
  error: NextResponse | null
}

/**
 * Verifies:
 *   1. The contract exists and is owned by the user.
 *   2. The contract status is 'complete' (has been processed).
 *
 * Returns the contract record on success, or a ready-to-return NextResponse on failure.
 */
export async function verifyContractForChat(
  contractId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<ChatSecurityResult> {
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, contract_text, status')
    .eq('id', contractId)
    .eq('user_id', userId)
    .single()

  if (error || !contract) {
    return {
      contract: null,
      error: NextResponse.json(
        { data: null, error: 'Contract not found.' },
        { status: 404 }
      ),
    }
  }

  if (contract.status !== 'complete') {
    return {
      contract: null,
      error: NextResponse.json(
        {
          data: null,
          error:
            contract.status === 'processing'
              ? 'Contract is still being analysed. Please wait for processing to complete.'
              : 'Contract must be fully processed before you can chat with it.',
        },
        { status: 409 }
      ),
    }
  }

  return { contract: contract as ContractForChat, error: null }
}

/**
 * Looks up or creates a chat session for the given contract + user.
 * Returns the session ID, or a NextResponse on failure.
 */
export async function upsertChatSession(
  contractId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{ sessionId: string; error: null } | { sessionId: null; error: NextResponse }> {
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', contractId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    return { sessionId: existing.id as string, error: null }
  }

  const { data: created, error: createError } = await supabase
    .from('chat_sessions')
    .insert({ contract_id: contractId, user_id: userId })
    .select('id')
    .single()

  if (createError || !created) {
    return {
      sessionId: null,
      error: NextResponse.json(
        { data: null, error: 'Failed to create chat session.' },
        { status: 500 }
      ),
    }
  }

  return { sessionId: created.id as string, error: null }
}
