'use client'

import { useState, useRef } from 'react'
import { nanoid } from 'nanoid'
import { ChatList } from '@/components/chat/chat-list'
import { ChatInput } from '@/components/chat/chat-input'
import { startRecording, transcribeAudio } from '@/lib/whisper'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  isTranscribing?: boolean
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const currentMessageId = useRef<string | null>(null)

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true)
      const audioUrl = URL.createObjectURL(file)
      const messageId = nanoid()
      const transcriptionId = nanoid()
      currentMessageId.current = transcriptionId
      
      // 创建用户的录音消息
      setMessages(prev => [...prev, {
        id: messageId,
        role: 'user',
        content: '',
        audioUrl,
      }])

      // 创建转录中的消息
      setMessages(prev => [...prev, {
        id: transcriptionId,
        role: 'assistant',
        content: '',
        isTranscribing: true
      }])

      // 开始转录并实时更新
      const transcriber = transcribeAudio(file, {
        language: 'zh',
        response_format: 'verbose_json',
        temperature: 0,
      })
      
      let fullText = ''
      
      try {
        for await (const text of transcriber) {
          fullText += text
          if (currentMessageId.current === transcriptionId) {
            setMessages(prev => prev.map(msg =>
              msg.id === transcriptionId
                ? { ...msg, content: fullText }
                : msg
            ))
          }
        }
      } catch (error) {
        console.error('转录过程出错:', error)
        setMessages(prev => prev.map(msg =>
          msg.id === transcriptionId
            ? { ...msg, content: `转录失败: ${error instanceof Error ? error.message : '未知错误'}`, isTranscribing: false }
            : msg
        ))
        return
      }

      // 完成转录
      setMessages(prev => prev.map(msg =>
        msg.id === transcriptionId
          ? { ...msg, isTranscribing: false }
          : msg
      ))

    } catch (error) {
      console.error('处理音频失败:', error)
      setMessages(prev => [...prev, {
        id: nanoid(),
        role: 'assistant',
        content: `转录失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }])
    } finally {
      setIsLoading(false)
      currentMessageId.current = null
    }
  }

  const handleRecordedAudio = async (audioBlob: Blob) => {
    try {
      setIsLoading(true)
      const messageId = nanoid()
      const transcriptionId = nanoid()
      currentMessageId.current = transcriptionId

      // 创建用户的录音消息
      const audioUrl = URL.createObjectURL(audioBlob)
      setMessages(prev => [...prev, {
        id: messageId,
        role: 'user',
        content: '',
        audioUrl,
      }])

      // 创建转录中的消息
      setMessages(prev => [...prev, {
        id: transcriptionId,
        role: 'assistant',
        content: '',
        isTranscribing: true
      }])
      
      // 开始转录并实时更新
      const transcriber = transcribeAudio(audioBlob, {
        language: 'zh',
        response_format: 'verbose_json',
        temperature: 0,
      })
      
      let fullText = ''
      
      try {
        for await (const text of transcriber) {
          fullText += text
          if (currentMessageId.current === transcriptionId) {
            setMessages(prev => prev.map(msg =>
              msg.id === transcriptionId
                ? { ...msg, content: fullText }
                : msg
            ))
          }
        }
      } catch (error) {
        console.error('转录过程出错:', error)
        setMessages(prev => prev.map(msg =>
          msg.id === transcriptionId
            ? { ...msg, content: `转录失败: ${error instanceof Error ? error.message : '未知错误'}`, isTranscribing: false }
            : msg
        ))
        return
      }

      // 完成转录
      setMessages(prev => prev.map(msg =>
        msg.id === transcriptionId
          ? { ...msg, isTranscribing: false }
          : msg
      ))

    } catch (error) {
      console.error('转录失败:', error)
      setMessages(prev => [...prev, {
        id: nanoid(),
        role: 'assistant',
        content: `转录失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }])
    } finally {
      setIsLoading(false)
      currentMessageId.current = null
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <ChatList messages={messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.role === 'user',
        audioUrl: msg.audioUrl,
        isTranscribing: msg.isTranscribing
      }))} />
      <div className="border-t bg-background p-4">
        <div className="container mx-auto max-w-4xl">
          <ChatInput
            onSendAudio={handleRecordedAudio}
            onSendFile={handleFileUpload}
          />
        </div>
      </div>
    </div>
  )
}
