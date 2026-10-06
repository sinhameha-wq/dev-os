import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit } from '@/lib/security/rateLimiter'
import { parseBody, chatBodySchema } from '@/lib/security/inputValidator'
import { sanitizeForLLM } from '@/lib/security/promptInjectionGuard'
import { verifyContractForChat, upsertChatSession } from '@/lib/security/chatSecurity'
import { TOKEN_LIMITS } from '@/lib/security/tokenLimiter'
import { sendChatMessage } from '@/lib/openai/chat'
import { withRetry } from '@/lib/utils/retry'
import type { ApiResponse, ChatMessage } from '@/types'

// GET — fetch chat history for a contract
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  // Verify contract ownership (no status check for history reads)
  const { data: contract } = await supabase
    .from('contracts')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!contract) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Contract not found.' },
      { status: 404 }
    )
  }

  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('contract_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return NextResponse.json({ data: { messages: [] }, error: null })
  }

  const { data: messages, error: msgError } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true })
    .limit(TOKEN_LIMITS.MAX_CHAT_HISTORY)

  if (msgError) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Failed to load chat history.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { messages: messages ?? [] }, error: null })
}

// POST — send a message and get a grounded AI response
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Auth
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  // 2. Rate limit — 30 messages per minute
  const rateLimitResponse = await checkRateLimit(user.id, 'chat')
  if (rateLimitResponse) return rateLimitResponse

  // 3. Validate body
  let rawBody: unknown = {}
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const bodyResult = parseBody(chatBodySchema, rawBody)
  if (bodyResult.error) return bodyResult.error
  const { message } = bodyResult.data

  // 4. Prompt injection guard
  const injectionCheck = sanitizeForLLM(message)
  if (!injectionCheck.safe) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: injectionCheck.reason ?? 'Message not allowed.' },
      { status: 400 }
    )
  }

  // 5. Verify contract ownership + status (must be 'complete')
  const contractCheck = await verifyContractForChat(params.id, user.id, supabase)
  if (contractCheck.error) return contractCheck.error
  const { contract } = contractCheck

  // 6. Upsert chat session
  const sessionResult = await upsertChatSession(params.id, user.id, supabase)
  if (sessionResult.error) return sessionResult.error
  const { sessionId } = sessionResult

  // 7. Fetch chat history
  const { data: history } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(TOKEN_LIMITS.MAX_CHAT_HISTORY)

  // 8. Call GPT-4o
  try {
    const { content, pageCitation } = await withRetry(
      () =>
        sendChatMessage(
          contract!.contract_text,
          (history ?? []) as ChatMessage[],
          message
        ),
      { maxAttempts: 3, baseDelayMs: 1000 }
    )

    // 9. Persist both messages
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
      page_citation: null,
    })

    const { data: assistantMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content,
        page_citation: pageCitation,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: 'Failed to save message.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        message: content,
        pageCitation,
        role: 'assistant',
        messageId: assistantMessage?.id ?? null,
      },
      error: null,
    })
  } catch {
    // Never forward internal error details to the client
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: 'Our AI is temporarily unavailable. Please try again in a few minutes.',
      },
      { status: 503 }
    )
  }
}
