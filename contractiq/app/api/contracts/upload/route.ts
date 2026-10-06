import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/authGuard'
import { checkRateLimit } from '@/lib/security/rateLimiter'
import { validateFileUpload, parseBody, uploadBodySchema } from '@/lib/security/inputValidator'
import { exceedsContractTokenLimit } from '@/lib/security/tokenLimiter'
import { extractTextWithPageMarkers } from '@/lib/pdf/parse'
import type { ApiResponse } from '@/types'

const MAX_PAGES = 20
const MIN_WORD_COUNT = 100

export async function POST(request: NextRequest) {
  // 1. Auth
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user, supabase } = auth

  // 2. Rate limit
  const rateLimitResponse = await checkRateLimit(user.id, 'upload')
  if (rateLimitResponse) return rateLimitResponse

  // 3. Parse form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Invalid form data.' },
      { status: 400 }
    )
  }

  const file = formData.get('file') as File | null
  const rawBody = {
    contractType: formData.get('contractType'),
    fileName: formData.get('fileName'),
  }

  if (!file) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'File is required.' },
      { status: 400 }
    )
  }

  // 4. Validate contractType + fileName with Zod (sanitizes fileName)
  const bodyResult = parseBody(uploadBodySchema, rawBody)
  if (bodyResult.error) return bodyResult.error
  const { contractType, fileName: sanitizedFileName } = bodyResult.data

  // 5. Validate file (extension → MIME type → size)
  const fileResult = validateFileUpload(file, sanitizedFileName)
  if (!fileResult.ok) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: fileResult.message },
      { status: fileResult.status }
    )
  }

  // 6. Extract text from PDF
  const buffer = Buffer.from(await file.arrayBuffer())
  let extracted: { text: string; pageCount: number; wordCount: number }

  try {
    extracted = await extractTextWithPageMarkers(buffer)
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: 'Failed to read the PDF. Please ensure it is a valid, non-password-protected PDF.',
      },
      { status: 422 }
    )
  }

  // 7. Content guards
  if (extracted.wordCount < MIN_WORD_COUNT) {
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: 'Scanned PDFs are not supported yet. Please upload a text-layer PDF.',
      },
      { status: 422 }
    )
  }

  if (extracted.pageCount > MAX_PAGES) {
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error: 'This PDF exceeds the 20-page limit. Please upload a shorter document.',
      },
      { status: 413 }
    )
  }

  if (exceedsContractTokenLimit(extracted.text)) {
    return NextResponse.json<ApiResponse<null>>(
      {
        data: null,
        error:
          'This contract exceeds the 15,000-token limit. Support for longer contracts is coming soon.',
      },
      { status: 422 }
    )
  }

  // 8. Insert contract row
  const { data: contract, error: insertError } = await supabase
    .from('contracts')
    .insert({
      user_id: user.id,
      name: sanitizedFileName,
      type: contractType,
      contract_text: extracted.text,
      status: 'pending',
      page_count: extracted.pageCount,
      word_count: extracted.wordCount,
    })
    .select('id')
    .single()

  if (insertError || !contract) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: 'Failed to save contract.' },
      { status: 500 }
    )
  }

  // 9. Non-blocking Storage upload
  // FIX: path is {user_id}/{contract_id}/{filename} — NOT contracts/{user_id}/...
  // The bucket is already named 'contracts'; prefixing again breaks storage RLS.
  const filePath = `${user.id}/${contract.id}/${sanitizedFileName}`

  void supabase.storage
    .from('contracts')
    .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false })
    .then(({ error: storageError }) => {
      if (storageError) {
        console.error('[Storage] Upload failed (non-critical):', storageError.message)
        return
      }
      void supabase
        .from('contracts')
        .update({ file_path: filePath })
        .eq('id', contract.id)
    })

  return NextResponse.json(
    {
      data: { contractId: contract.id, pageCount: extracted.pageCount, status: 'pending' },
      error: null,
    },
    { status: 201 }
  )
}
