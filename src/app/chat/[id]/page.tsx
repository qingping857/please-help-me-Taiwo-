'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChatList } from '@/components/chat/chat-list'
import { ChatInput } from '@/components/chat/chat-input'
import { getHistories, updateHistory } from '@/lib/history'
import { SpeechRecognition } from '@/lib/speech-recognition'
import { nanoid } from 'nanoid'
import { Message } from '@/types'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const router = useRouter()
  const params = useParams()
  const chatId = params?.id as string
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null)

  // 加载历史记录
  useEffect(() => {
    if (!chatId) return
    
    const histories = getHistories()
    const history = histories.find(h => h.id === chatId)
    if (!history) {
      router.push('/')
      return
    }
    setMessages(history.messages)
  }, [chatId, router])

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    try {
      // 1. 创建用户消息
      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: '正在处理音频文件...',
        audioUrl: URL.createObjectURL(file),
        isTranscribing: true
      }
      setMessages(prev => [...prev, userMessage])

      // 2. 创建转写消息
      const transcriptMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: '正在转写...',
        isTranscribing: true
      }
      setMessages(prev => [...prev, transcriptMessage])

      // 3. 获取 SpeechRecognition 实例
      speechRecognitionRef.current = SpeechRecognition.getInstance((text) => {
        // 更新转写消息
        setMessages(prev => prev.map(msg => 
          msg.id === transcriptMessage.id 
            ? { ...msg, content: text, isTranscribing: false }
            : msg
        ))
      })

      // 4. 开始处理音频文件
      await speechRecognitionRef.current.uploadAudio(file)

      // 5. 更新历史记录
      updateHistory(chatId, {
        messages: messages,
        date: new Date().toLocaleString()
      })

    } catch (error) {
      console.error('处理音频文件失败:', error)
      // 显示错误消息
      setMessages(prev => prev.map(msg => 
        msg.role === 'assistant' && msg.isTranscribing
          ? { ...msg, content: `转写失败: ${error instanceof Error ? error.message : '未知错误'}`, isTranscribing: false }
          : msg
      ))
    }
  }

  // 开始录音
  const handleStartRecording = async () => {
    try {
      // 1. 获取 SpeechRecognition 实例
      speechRecognitionRef.current = SpeechRecognition.getInstance((text) => {
        // 更新转写消息
        setMessages(prev => prev.map(msg => 
          msg.role === 'assistant' && msg.isTranscribing
            ? { ...msg, content: text, isTranscribing: false }
            : msg
        ))
      })

      // 2. 开始录音
      await speechRecognitionRef.current.startRecording()
      setIsRecording(true)

    } catch (error) {
      console.error('开始录音失败:', error)
      alert('开始录音失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 停止录音
  const handleStopRecording = async () => {
    try {
      if (!speechRecognitionRef.current) {
        throw new Error('SpeechRecognition not initialized')
      }

      // 1. 停止录音并获取音频数据
      const audioBlob = await speechRecognitionRef.current.stopRecording()
      setIsRecording(false)

      // 2. 创建用户消息
      const userMessage: Message = {
        id: nanoid(),
        role: 'user',
        content: '正在处理录音...',
        audioUrl: URL.createObjectURL(audioBlob),
        isTranscribing: true
      }
      setMessages(prev => [...prev, userMessage])

      // 3. 创建转写消息
      const transcriptMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: '正在转写...',
        isTranscribing: true
      }
      setMessages(prev => [...prev, transcriptMessage])

      // 4. 处理录音数据
      await speechRecognitionRef.current.handleRecordedAudio(audioBlob)

      // 5. 更新历史记录
      updateHistory(chatId, {
        messages: messages,
        date: new Date().toLocaleString()
      })

    } catch (error) {
      console.error('停止录音失败:', error)
      setIsRecording(false)
      // 显示错误消息
      setMessages(prev => prev.map(msg => 
        msg.role === 'assistant' && msg.isTranscribing
          ? { ...msg, content: `转写失败: ${error instanceof Error ? error.message : '未知错误'}`, isTranscribing: false }
          : msg
      ))
    }
  }

  if (!chatId) {
    return null
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <ChatList messages={messages} />
      <div className="border-t bg-background p-4">
        <div className="container mx-auto max-w-4xl">
          <ChatInput 
            onSendFile={handleFileUpload}
            onSendAudio={handleStartRecording}
            onStopRecording={handleStopRecording}
            isRecording={isRecording}
          />
        </div>
      </div>
    </div>
  )
} 