import { z } from 'zod'
import path from 'path'
import { TOKEN_LIMITS } from '@/lib/security/tokenLimiter'
import { NextResponse } from 'next/server'

// ─── Zod Schemas ─────────────────────────────────────────────

export const uploadBodySchema = z.object({
  contractType: z.enum(['NDA', 'MSA'], {
    errorMap: () => ({ message: 'Contract type must be NDA or MSA.' }),
  }),
  fileName: z
    .string()
    .min(1, 'File name is required.')
    .max(255, 'File name is too long.')
    .transform((name) => path.basename(name).replace(/[^a-zA-Z0-9._\-() ]/g, '_')),
})

export const processBodySchema = z.object({
  customTerms: z
    .array(z.string().min(1).max(100))
    .max(5, 'Maximum 5 custom terms allowed.')
    .optional()
    .default([]),
})

export const chatBodySchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required.')
    .max(TOKEN_LIMITS.MAX_MESSAGE_LENGTH, `Message must be ${TOKEN_LIMITS.MAX_MESSAGE_LENGTH} characters or fewer.`)
    .transform((s) => s.trim()),
})

export const termEditBodySchema = z.object({
  value: z
    .string()
    .min(1, 'Value is required.')
    .max(5000, 'Value is too long.')
    .transform((s) => s.trim()),
})

export const feedbackBodySchema = z.object({
  contractId: z.string().uuid('Invalid contract ID.'),
  rating: z.enum(['thumbs_up', 'thumbs_down'], {
    errorMap: () => ({ message: 'Rating must be thumbs_up or thumbs_down.' }),
  }),
  comment: z.string().max(1000, 'Comment must be 1000 characters or fewer.').optional(),
})

// ─── File Upload Validation ───────────────────────────────────

const ALLOWED_EXTENSIONS = new Set(['.pdf'])
const ALLOWED_MIME_TYPES = new Set(['application/pdf'])
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
  '.php', '.zip', '.tar', '.gz', '.sh', '.bash', '.bat',
  '.cmd', '.py', '.rb', '.ps1', '.vbs', '.jar', '.dll',
  '.so', '.dylib', '.html', '.htm', '.xml', '.json',
])

export interface FileValidationError {
  ok: false
  message: string
  status: number
}

export interface FileValidationSuccess {
  ok: true
  extension: string
  sanitizedName: string
}

export function validateFileUpload(
  file: File,
  rawFileName: string
): FileValidationError | FileValidationSuccess {
  const sanitizedName = path.basename(rawFileName).replace(/[^a-zA-Z0-9._\-() ]/g, '_')
  const ext = path.extname(sanitizedName).toLowerCase()

  // 1. Extension blocklist (belt-and-suspenders against extension spoofing)
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      message: `File type '${ext}' is not allowed.`,
      status: 400,
    }
  }

  // 2. Extension allowlist
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      message: 'Only PDF files are accepted.',
      status: 400,
    }
  }

  // 3. MIME type (second layer — MIME alone can be spoofed)
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      message: 'File MIME type does not match the allowed types.',
      status: 400,
    }
  }

  // 4. File size
  if (file.size > TOKEN_LIMITS.MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: 'File exceeds the 10 MB limit. Please upload a smaller document.',
      status: 413,
    }
  }

  return { ok: true, extension: ext, sanitizedName }
}

// ─── Generic Zod parse helper ─────────────────────────────────

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { data: T; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.errors[0]?.message ?? 'Invalid request body.'
    return {
      data: null,
      error: NextResponse.json({ data: null, error: message }, { status: 422 }),
    }
  }
  return { data: result.data, error: null }
}
