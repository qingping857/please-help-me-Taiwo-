import { useEffect, useRef } from 'react'
import { Message } from './message'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
}

interface ChatListProps {
  messages: Message[]
}

export function ChatList({ messages }: ChatListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <Message key={message.id} {...message} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
} 