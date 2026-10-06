import OpenAI from 'openai'
import type { ContractType } from '@/types'

// Lazy singleton — avoids instantiation at build time when env vars are absent
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const NDA_STANDARD_TERMS = [
  'Parties', 'Effective Date', 'Confidentiality Obligations',
  'Permitted Disclosures', 'Term & Duration', 'Governing Law',
  'Jurisdiction', 'IP Ownership', 'Non-Solicitation', 'Breach & Remedy',
]

const MSA_STANDARD_TERMS = [
  'Parties', 'Service Scope', 'Payment Terms', 'Invoice Schedule',
  'Late Payment Penalty', 'Liability Cap', 'Indemnification',
  'IP Ownership', 'Termination Clause', 'Governing Law',
  'Dispute Resolution', 'Notice Period',
]

const SYSTEM_PROMPT = `You are a contract analysis expert specialising in NDAs and MSAs. Extract the specified key terms from the contract text provided.

Return a JSON object with a "terms" array. Each element must match this schema exactly:
{
  "term_name": "string — exact term name from the requested list",
  "value": "string — the extracted value or relevant clause text",
  "page_number": number — 1-indexed page number from [PAGE N] markers,
  "confidence_score": number — 0.0 to 1.0 (0.9+ clearly stated, 0.7–0.89 inferred, 0.5–0.69 ambiguous, <0.5 very uncertain),
  "source_sentence": "string — verbatim sentence from the contract"
}

Rules:
- Only include terms present in the document. Omit terms you cannot find.
- page_number must match the nearest [PAGE N] marker before the text.
- source_sentence must be a verbatim excerpt from the contract.
- Return ONLY the JSON object — no explanation, no markdown.

Example response format:
{"terms":[{"term_name":"Governing Law","value":"State of California","page_number":3,"confidence_score":0.97,"source_sentence":"This Agreement shall be governed by the laws of the State of California."}]}`

export interface ExtractedTerm {
  termName: string
  value: string
  pageNumber: number
  confidenceScore: number
  sourceSentence: string
  isCustom: boolean
}

export function buildExtractionPrompt(
  contractText: string,
  contractType: ContractType,
  customTerms: string[] = []
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const standardTerms = contractType === 'NDA' ? NDA_STANDARD_TERMS : MSA_STANDARD_TERMS
  const allTerms = [...standardTerms, ...customTerms]

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Extract these key terms from the following ${contractType} contract.\n\nTerms to extract: ${JSON.stringify(allTerms)}\n\nContract text:\n${contractText}`,
    },
  ]
}

interface RawTerm {
  term_name: string
  value: string
  page_number: number
  confidence_score: number
  source_sentence: string
}

function parseTermsFromResponse(raw: unknown, customTermNames: string[]): ExtractedTerm[] {
  let termsArray: unknown[]

  if (Array.isArray(raw)) {
    termsArray = raw
  } else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>
    const arrayValue = Object.values(obj).find(Array.isArray)
    if (!arrayValue) throw new Error('No array found in extraction response')
    termsArray = arrayValue as unknown[]
  } else {
    throw new Error('Unexpected extraction response format')
  }

  return termsArray.map((item) => {
    const term = item as RawTerm
    if (!term.term_name || !term.value || !term.source_sentence) {
      throw new Error(`Invalid term schema: ${JSON.stringify(term)}`)
    }
    return {
      termName: term.term_name,
      value: term.value,
      pageNumber: typeof term.page_number === 'number' ? term.page_number : 1,
      confidenceScore: Math.max(0, Math.min(1, term.confidence_score ?? 0.5)),
      sourceSentence: term.source_sentence,
      isCustom: customTermNames.includes(term.term_name),
    }
  })
}

export async function extractKeyTerms(
  contractText: string,
  contractType: ContractType,
  customTerms: string[] = []
): Promise<ExtractedTerm[]> {
  const messages = buildExtractionPrompt(contractText, contractType, customTerms)
  let firstContent: string | null = null

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000,
    })

    firstContent = response.choices[0]?.message?.content ?? null
    if (!firstContent) throw new Error('Empty response from OpenAI')

    const parsed = JSON.parse(firstContent) as unknown
    return parseTermsFromResponse(parsed, customTerms)
  } catch (err) {
    // Single retry with stricter JSON instruction
    if (firstContent !== null) {
      const retryMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        ...messages,
        { role: 'assistant', content: firstContent },
        {
          role: 'user',
          content: 'Your response was not a valid JSON object. Return ONLY a JSON object with a "terms" array. No explanation, no markdown.',
        },
      ]
      const retryResponse = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: retryMessages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000,
      })
      const retryContent = retryResponse.choices[0]?.message?.content ?? ''
      const retryParsed = JSON.parse(retryContent) as unknown
      return parseTermsFromResponse(retryParsed, customTerms)
    }
    throw err
  }
}
