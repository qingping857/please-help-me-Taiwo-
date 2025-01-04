'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Pause, Play, StopCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useRef, useEffect, useCallback } from "react"
import { useRecorder } from "@/hooks/use-recorder"
import { LanguageSelect, languages } from "@/components/ui/language-select"
import { transcribeAudio } from "@/lib/openai"
import type { LanguageCode } from "@/components/ui/language-select"

interface Message {
  id: string
  text: string
  isRecording?: boolean
  audioUrl?: string
  language?: LanguageCode
}

export function MainContent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(languages[0].code)
  const currentMessageRef = useRef<string | null>(null)

  const handleDataAvailable = useCallback(async (blob: Blob) => {
    if (!currentMessageRef.current) return

    try {
      console.log('收到新的音频数据，大小:', Math.round(blob.size / 1024), 'KB')
      const result = await transcribeAudio(blob, {
        language: selectedLanguage
      })

      setMessages(messages => messages.map(msg =>
        msg.id === currentMessageRef.current
          ? { ...msg, text: msg.text + result.text }
          : msg
      ))
    } catch (error) {
      console.error('实时转录失败:', error)
    }
  }, [selectedLanguage])

  const recorder = useRecorder(handleDataAvailable)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleLanguageChange = useCallback((value: LanguageCode) => {
    setSelectedLanguage(value)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    try {
      console.log('开始录音...')
      const messageId = Date.now().toString()
      currentMessageRef.current = messageId
      
      setMessages([
        ...messages,
        { 
          id: messageId, 
          text: "", 
          isRecording: true,
          language: selectedLanguage
        }
      ])
      
      await recorder.startRecording()
      console.log('录音已开始')
    } catch (error) {
      console.error('录音启动失败:', error)
      currentMessageRef.current = null
    }
  }

  const handleStopRecording = async () => {
    try {
      console.log('停止录音...')
      recorder.stopRecording()
      console.log('录音已停止')

      const audioBlob = await recorder.getAudioBlob()
      if (audioBlob && currentMessageRef.current) {
        console.log('获取到完整音频数据')
        const audioUrl = URL.createObjectURL(audioBlob)
        
        setMessages(messages => messages.map(msg =>
          msg.id === currentMessageRef.current
            ? { ...msg, isRecording: false, audioUrl }
            : msg
        ))
      }
      
      currentMessageRef.current = null
    } catch (error) {
      console.error('停止录音过程出错:', error)
    }
  }

  return (
    <div className="relative flex flex-1 flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex h-[calc(100vh-180px)] items-center justify-center p-4"
              >
                <div className="text-center space-y-4">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                    语音转文字平台
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400">
                    点击下方按钮开始录音
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="p-4 space-y-6">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    {message.isRecording ? (
                      <div className="flex items-center justify-center py-8">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-4 h-4 bg-red-500 rounded-full"
                        />
                        <span className="ml-3 text-sm text-gray-500">
                          录音中... {formatDuration(recorder.duration)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white">
                            <Mic className="w-4 h-4" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-gray-500">您的语音</p>
                            <div className="inline-flex items-center space-x-2">
                              <span className="text-xs text-gray-400">
                                {languages.find(lang => lang.code === message.language)?.name}
                              </span>
                              {message.audioUrl && (
                                <audio src={message.audioUrl} controls className="h-8" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start space-x-4">
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-500">转录文本</p>
                            <div className="mt-1 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                {message.text || "正在转录..."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 底部控制区域 */}
      <div className="border-t bg-white dark:bg-gray-800">
        <div className="max-w-3xl mx-auto p-4">
          <div className="space-y-4">
            <div className="flex justify-center">
              <LanguageSelect
                value={selectedLanguage}
                onValueChange={handleLanguageChange}
              />
            </div>
            <div className="flex gap-2">
              {!recorder.isRecording ? (
                <Button
                  size="lg"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleStartRecording}
                >
                  <Mic className="mr-2 h-5 w-5" />
                  开始录音
                </Button>
              ) : (
                <>
                  {!recorder.isPaused ? (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={recorder.pauseRecording}
                      className="flex-1"
                    >
                      <Pause className="mr-2 h-5 w-5" />
                      暂停
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={recorder.resumeRecording}
                      className="flex-1"
                    >
                      <Play className="mr-2 h-5 w-5" />
                      继续
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="destructive"
                    className="flex-1"
                    onClick={handleStopRecording}
                  >
                    <StopCircle className="mr-2 h-5 w-5" />
                    停止录音
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 