'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatMessage, TypingIndicator } from '@/components/chat/ChatMessage'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { usePageNavigation } from '@/hooks/usePageNavigation'
import type { ChatMessage as ChatMessageType } from '@/types'

interface ChatInterfaceProps {
  contractId: string
}

export function ChatInterface({ contractId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { navigateToPage } = usePageNavigation()

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/contracts/${contractId}/chat`)
        const json = await res.json()
        if (res.ok && json.data) {
          setMessages(json.data.messages ?? [])
        }
      } catch {
        // Non-critical — empty state is acceptable
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [contractId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending) return

    setInput('')
    setSending(true)

    // Optimistic user message
    const optimisticId = `optimistic-${Date.now()}`
    const userMsg: ChatMessageType = {
      id: optimisticId,
      session_id: '',
      role: 'user',
      content: trimmed,
      page_citation: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch(`/api/contracts/${contractId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const json = await res.json()

      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Chat failed. Please try again.')
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        setInput(trimmed)
        return
      }

      const assistantMsg: ChatMessageType = {
        id: json.data.messageId ?? `assistant-${Date.now()}`,
        session_id: '',
        role: 'assistant',
        content: json.data.message,
        page_citation: json.data.pageCitation ?? null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      toast.error('Something went wrong. Please try again.')
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setInput(trimmed)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const charCount = input.length
  const atLimit = charCount >= 1800

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className={`h-12 rounded-lg ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-grey-50 border border-grey-100 p-3 mb-3">
              <MessageCircle size={20} className="text-grey-300" />
            </div>
            <p className="text-sm font-medium text-grey-700">Ask about this contract</p>
            <p className="mt-1 text-xs text-grey-400 max-w-[200px] leading-relaxed">
              Questions are answered strictly from the document text.
            </p>
          </div>
        )}

        {!loading && messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onCitationClick={navigateToPage}
          />
        ))}

        {sending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-grey-100 bg-white p-3"
      >
        {atLimit && (
          <p className="mb-1.5 text-xs text-warning-600">
            {charCount}/2000 — approaching character limit
          </p>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this contract…"
            maxLength={2000}
            disabled={sending || loading}
            className="flex-1 rounded-md border border-grey-200 bg-white px-3 py-2 text-sm text-grey-900 placeholder:text-grey-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            style={{ letterSpacing: 0 }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || loading}
            className="inline-flex items-center justify-center rounded-md bg-brand px-3 py-2 text-white transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-grey-300">
          Answers are grounded strictly in this document.
        </p>
      </form>
    </div>
  )
}
