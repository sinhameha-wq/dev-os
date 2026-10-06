export const TOKEN_LIMITS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,           // 10 MB
  MAX_PAGE_COUNT: 20,
  MAX_CONTRACT_TOKENS: 15_000,
  MAX_MESSAGE_LENGTH: 5_000,
  MAX_CHAT_HISTORY: parseInt(process.env.MAX_CHAT_HISTORY ?? '100', 10),
  CHARS_PER_TOKEN: 4,                               // conservative estimate for legal prose
} as const

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKEN_LIMITS.CHARS_PER_TOKEN)
}

export function exceedsContractTokenLimit(text: string): boolean {
  return estimateTokens(text) > TOKEN_LIMITS.MAX_CONTRACT_TOKENS
}

export function exceedsMessageLength(message: string): boolean {
  return message.length > TOKEN_LIMITS.MAX_MESSAGE_LENGTH
}
