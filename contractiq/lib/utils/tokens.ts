const MAX_TOKENS = 15_000
const CHARS_PER_TOKEN = 4

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function exceedsTokenLimit(text: string): boolean {
  return estimateTokenCount(text) > MAX_TOKENS
}
