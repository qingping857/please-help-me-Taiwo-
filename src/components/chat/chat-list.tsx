'use client'

import { Message } from '@/types'

interface ChatListProps {
  messages: Message[]
}

export function ChatList({ messages }: ChatListProps) {
  return (
    <div className="space-y-4 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-4 ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            <div className="text-sm">
              {message.content}
              {message.isTranscribing && (
                <span className="ml-2 animate-pulse">...</span>
              )}
            </div>
            {message.audioUrl && (
              <audio
                className="mt-2"
                controls
                src={message.audioUrl}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 