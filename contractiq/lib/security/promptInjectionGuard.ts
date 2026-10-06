/**
 * Guards against prompt injection attempts in user-supplied chat messages.
 * Called on the raw user message BEFORE it is sent to the LLM.
 * Contract text is NOT scanned — injection inside the document is mitigated
 * by the system prompt instructing the model to treat it as data only.
 */

interface ScanResult {
  safe: boolean
  reason?: string
}

const INJECTION_PATTERNS: RegExp[] = [
  // Instruction override attempts
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /disregard\s+(all\s+)?previous\s+instructions?/i,
  /forget\s+(all\s+)?previous\s+instructions?/i,
  /override\s+(your\s+)?(rules?|instructions?|prompt)/i,

  // System prompt extraction
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /print\s+(your\s+)?(system\s+)?instructions?/i,
  /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/i,
  /what\s+(are\s+)?your\s+instructions?/i,
  /repeat\s+(your\s+)?(system\s+)?prompt/i,

  // Environment / secrets extraction
  /expose\s+(env|environment)\s+variables?/i,
  /show\s+(me\s+)?(your\s+)?api\s+keys?/i,
  /print\s+(your\s+)?(api\s+key|secret|password|token)/i,
  /what\s+is\s+(your\s+)?api\s+key/i,

  // Persona hijacking
  /you\s+are\s+now\s+a/i,
  /act\s+as\s+(a\s+|an\s+)?(?!lawyer|attorney)/i,  // "act as a lawyer" is fine
  /pretend\s+(you\s+are|to\s+be)/i,
  /role\s*play\s+as/i,
  /simulate\s+(being\s+)?a/i,

  // Jailbreak keywords
  /\bjailbreak\b/i,
  /\bdan\s+mode\b/i,
  /\bdeveloper\s+mode\b/i,
  /\bgod\s+mode\b/i,

  // Safety bypass
  /disable\s+(your\s+)?(safety|content)\s+(filter|policy|guidelines?)/i,
  /bypass\s+(your\s+)?(safety|content|security)/i,
  /without\s+(any\s+)?(restriction|limitation|filter)/i,
]

export function sanitizeForLLM(message: string): ScanResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      return {
        safe: false,
        reason: 'Message contains content that is not permitted.',
      }
    }
  }
  return { safe: true }
}
