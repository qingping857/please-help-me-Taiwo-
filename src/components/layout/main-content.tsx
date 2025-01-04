'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, StopCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { useAliyunRecorder } from "@/hooks/use-aliyun-recorder"

interface Message {
  id: string
  text: string
  isRecording?: boolean
}

export function MainContent() {
  const [messages, setMessages] = useState<Message[]>([])
  const currentMessageRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleTranscript = (text: string) => {
    if (currentMessageRef.current) {
      setMessages(messages => messages.map(msg =>
        msg.id === currentMessageRef.current
          ? { ...msg, text }
          : msg
      ))
    }
  }

  const recorder = useAliyunRecorder(handleTranscript)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleStartRecording = async () => {
    if (!recorder.isInitialized) {
      console.error('配置未初始化')
      return
    }

    try {
      console.log('开始录音...')
      const messageId = Date.now().toString()
      currentMessageRef.current = messageId
      
      setMessages([
        ...messages,
        { 
          id: messageId, 
          text: "", 
          isRecording: true
        }
      ])
      
      await recorder.startRecording()
      console.log('录音已开始')
    } catch (error) {
      console.error('录音启动失败:', error)
      currentMessageRef.current = null
    }
  }

  const handleStopRecording = () => {
    try {
      console.log('停止录音...')
      recorder.stopRecording()
      console.log('录音已停止')

      if (currentMessageRef.current) {
        setMessages(messages => messages.map(msg =>
          msg.id === currentMessageRef.current
            ? { ...msg, isRecording: false }
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
                          正在录音... {recorder.duration}秒
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-start space-x-4">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white">
                            <Mic className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
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
            {recorder.error && (
              <div className="text-sm text-red-500 text-center">
                {recorder.error}
              </div>
            )}
            <div className="flex gap-2">
              {!recorder.isRecording ? (
                <Button
                  size="lg"
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleStartRecording}
                  disabled={!recorder.isInitialized}
                >
                  <Mic className="mr-2 h-5 w-5" />
                  {recorder.isInitialized ? '开始录音' : '正在初始化...'}
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-full"
                  onClick={handleStopRecording}
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  停止录音
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 