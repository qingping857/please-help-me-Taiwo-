'use client'

import { useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { Message } from '@/types'
import { ChatList } from '@/components/chat/chat-list'
import { ChatInput } from '@/components/chat/chat-input'
import { SpeechRecognition } from '@/lib/speech-recognition'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null)

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

      // 3. 创建 SpeechRecognition 实例
      speechRecognitionRef.current = new SpeechRecognition((text) => {
        // 更新转写消息
        setMessages(prev => prev.map(msg => 
          msg.id === transcriptMessage.id 
            ? { ...msg, content: text, isTranscribing: false }
            : msg
        ))
      })

      // 4. 开始处理音频文件
      await speechRecognitionRef.current.uploadAudio(file)

    } catch (error) {
      console.error('处理音频文件失败:', error)
      // 显示错误消息
      setMessages(prev => prev.map(msg => 
        msg.role === 'assistant' && msg.content === '正在转写...'
          ? { ...msg, content: `转写失败: ${error instanceof Error ? error.message : '未知错误'}`, isTranscribing: false }
          : msg
      ))
    }
  }

  // 开始录音
  const handleStartRecording = async () => {
    try {
      // 1. 创建 SpeechRecognition 实例
      speechRecognitionRef.current = new SpeechRecognition((text) => {
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

  return (
    <main className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto">
        <ChatList messages={messages} />
      </div>
      <div className="p-4 border-t">
        <ChatInput 
          onSendFile={handleFileUpload}
          onSendAudio={handleStartRecording}
          onStopRecording={handleStopRecording}
          isRecording={isRecording}
        />
      </div>
    </main>
  )
}
