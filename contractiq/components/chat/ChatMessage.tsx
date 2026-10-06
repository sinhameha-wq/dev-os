'use client'

import { cn } from '@/lib/utils/cn'
import type { ChatMessage as ChatMessageType } from '@/types'

interface ChatMessageProps {
  message: ChatMessageType
  onCitationClick: (page: number) => void
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[84%] rounded-lg px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-brand text-white'
            : 'border border-grey-100 bg-white text-grey-900'
        )}
      >
        <p style={{ letterSpacing: 0 }}>{message.content}</p>

        {!isUser && message.page_citation !== null && message.page_citation !== undefined && (
          <button
            onClick={() => onCitationClick(message.page_citation!)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <span>→</span>
            <span>Source: Page {message.page_citation}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="border border-grey-100 bg-white rounded-lg px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-grey-300 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-grey-300 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-grey-300 animate-bounce" />
        </div>
      </div>
    </div>
  )
}
