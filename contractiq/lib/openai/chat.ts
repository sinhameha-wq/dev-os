import OpenAI from 'openai'
import type { ChatMessage } from '@/types'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const SYSTEM_PROMPT_TEMPLATE = `You are a contract review assistant. Answer questions ONLY using the document text provided below. Do not use your general legal knowledge.

If the answer is not in the document, respond with: "I cannot find this in the document."

Every response must end with a page citation in the format [Page X].
Begin every response with "Based on the document, "

CONTRACT TEXT:
{CONTRACT_TEXT}`

export function buildChatMessages(
  contractText: string,
  history: ChatMessage[],
  newMessage: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const systemContent = SYSTEM_PROMPT_TEMPLATE.replace('{CONTRACT_TEXT}', contractText)

  const historyMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = history.map(
    (msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content })
  )

  return [
    { role: 'system', content: systemContent },
    ...historyMessages,
    { role: 'user', content: newMessage },
  ]
}

export function extractPageCitation(content: string): number | null {
  const match = content.match(/\[Page\s+(\d+)\]/i)
  return match ? parseInt(match[1], 10) : null
}

export async function sendChatMessage(
  contractText: string,
  history: ChatMessage[],
  newMessage: string
): Promise<{ content: string; pageCitation: number | null }> {
  const messages = buildChatMessages(contractText, history.slice(-200), newMessage)

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.4,
    max_tokens: 1000,
  })

  const content =
    response.choices[0]?.message?.content ?? 'I cannot find this in the document.'
  const pageCitation = extractPageCitation(content)

  return { content, pageCitation }
}
