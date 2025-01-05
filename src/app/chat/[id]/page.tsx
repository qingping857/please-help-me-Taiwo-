'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChatList } from '@/components/chat/chat-list'
import { ChatInput } from '@/components/chat/chat-input'
import { getHistories, updateHistory } from '@/lib/history'
import { transcribeAudio } from '@/lib/whisper'
import { nanoid } from 'nanoid'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  isTranscribing?: boolean
}

export default function ChatPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // 加载历史记录
  useEffect(() => {
    const histories = getHistories()
    const history = histories.find(h => h.id === params.id)
    if (!history) {
      router.push('/')
      return
    }
    setMessages(history.messages)
  }, [params.id, router])

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true)
      const audioUrl = URL.createObjectURL(file)
      const messageId = nanoid()
      const transcriptionId = nanoid()
      
      // 创建用户的录音消息
      const newMessages = [
        ...messages,
        {
          id: messageId,
          role: 'user' as const,
          content: '',
          audioUrl,
        },
        {
          id: transcriptionId,
          role: 'assistant' as const,
          content: '',
          isTranscribing: true
        }
      ]
      setMessages(newMessages)

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
          setMessages(prev => prev.map(msg =>
            msg.id === transcriptionId
              ? { ...msg, content: fullText }
              : msg
          ))
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

      // 更新历史记录
      updateHistory(params.id, {
        messages: newMessages,
        date: new Date().toLocaleString()
      })

    } catch (error) {
      console.error('处理音频失败:', error)
      const errorMessage = {
        id: nanoid(),
        role: 'assistant' as const,
        content: `转录失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
      setMessages(prev => [...prev, errorMessage])
      updateHistory(params.id, {
        messages: [...messages, errorMessage],
        date: new Date().toLocaleString()
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecordedAudio = async (audioBlob: Blob) => {
    try {
      setIsLoading(true)
      const messageId = nanoid()
      const transcriptionId = nanoid()

      // 创建用户的录音消息
      const audioUrl = URL.createObjectURL(audioBlob)
      const newMessages = [
        ...messages,
        {
          id: messageId,
          role: 'user' as const,
          content: '',
          audioUrl,
        },
        {
          id: transcriptionId,
          role: 'assistant' as const,
          content: '',
          isTranscribing: true
        }
      ]
      setMessages(newMessages)
      
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
          setMessages(prev => prev.map(msg =>
            msg.id === transcriptionId
              ? { ...msg, content: fullText }
              : msg
          ))
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

      // 更新历史记录
      updateHistory(params.id, {
        messages: newMessages,
        date: new Date().toLocaleString()
      })

    } catch (error) {
      console.error('转录失败:', error)
      const errorMessage = {
        id: nanoid(),
        role: 'assistant' as const,
        content: `转录失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
      setMessages(prev => [...prev, errorMessage])
      updateHistory(params.id, {
        messages: [...messages, errorMessage],
        date: new Date().toLocaleString()
      })
    } finally {
      setIsLoading(false)
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