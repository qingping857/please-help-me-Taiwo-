'use client'

import { useEffect, useRef } from 'react'
import { Message } from './message'

export interface ChatMessage {
  id: string
  content: string
  isUser: boolean
  audioUrl?: string
}

interface ChatListProps {
  messages: ChatMessage[]
}

export function ChatList({ messages }: ChatListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      {messages.map((message) => (
        <Message
          key={message.id}
          content={message.content}
          isUser={message.isUser}
          audioUrl={message.audioUrl}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
} 