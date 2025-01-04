'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import { ChatList } from '@/components/chat-list'
import { ChatInput } from '@/components/chat-input'
import { transcribeAudio } from '@/lib/whisper'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (file: File) => {
    try {
      setIsLoading(true)
      const audioUrl = URL.createObjectURL(file)
      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: '正在转录音频...',
        audioUrl,
      }
      setMessages((prev) => [...prev, userMessage])

      const text = await transcribeAudio(file)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, content: text } : msg
        )
      )

      const assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: '音频转录完成！',
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('处理音频失败:', error)
      const errorMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: '音频转录失败，请重试。',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b p-4">
        <h1 className="text-lg font-semibold">语音转文字</h1>
      </header>
      <ChatList messages={messages} />
      <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
