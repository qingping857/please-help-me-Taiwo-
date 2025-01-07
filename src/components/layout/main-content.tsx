'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, StopCircle, Upload, File, X, Loader2, FileDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useRef, useEffect, useMemo } from "react"
import { SpeechRecognition } from "@/lib/speech-recognition"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { SentenceBlock } from '@/components/sentence-block'
import { useRouter, usePathname } from "next/navigation"
import { getHistories, saveHistories } from "@/lib/history"
import type { HistoryItem } from "@/lib/history"

interface QueuedFile {
  id: string
  file: File
  status: 'waiting' | 'processing' | 'completed' | 'error'
  text: string | undefined
  error?: string
}

export function MainContent() {
  const router = useRouter()
  const pathname = usePathname()
  
  // 获取当前聊天ID并确保其有效
  const chatId = useMemo(() => {
    const id = pathname?.split('/').pop()
    return id && id !== 'new' ? id : null
  }, [pathname])

  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([])
  const [queueProcessingState, setQueueProcessingState] = useState<'idle' | 'processing'>('idle')
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  // 获取当前页面的文本和状态
  const getCurrentPageContent = () => {
    if (fileQueue.length === 0) {
      // 如果没有文件队列，显示录音转写的文本
      return {
        text: transcribedText,
        isProcessing: isTranscribing
      }
    }

    // 获取当前页面对应的文件
    const currentFile = fileQueue[currentPageIndex]
    if (!currentFile) {
      return {
        text: '',
        isProcessing: false
      }
    }

    return {
      text: currentFile.text || '',
      isProcessing: currentFile.status === 'processing'
    }
  }

  // 处理翻页
  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    } else if (direction === 'next' && currentPageIndex < fileQueue.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    }
  }

  // 从本地存储加载内容
  useEffect(() => {
    if (!chatId) return

    const histories = getHistories()
    const currentHistory = histories.find((h: HistoryItem) => h.id === chatId)
    
    // 如果找不到对应的历史记录，跳转到新建页面
    if (!currentHistory) {
      console.warn('找不到历史记录:', chatId)
      // 删除无效的历史记录
      const cleanedHistories = histories.filter(h => h.id !== chatId)
      saveHistories(cleanedHistories)
      // 跳转到新建页面
      router.replace('/chat/new')
      return
    }

    // 加载历史记录内容
    if (currentHistory.content) {
      setTranscribedText(currentHistory.content.text || '')
      setFileQueue(currentHistory.content.fileQueue || [])
      setCurrentPageIndex(currentHistory.content.currentPageIndex || 0)
    } else {
      resetState()
    }
  }, [chatId, router])

  // 保存内容到本地存储
  const saveToLocalStorage = (text: string, files: QueuedFile[], pageIndex: number) => {
    if (!chatId) return
    
    const histories = getHistories()
    const updatedHistories = histories.map((h: HistoryItem) => {
      if (h.id === chatId) {
        return {
          ...h,
          content: {
            text,
            fileQueue: files,
            currentPageIndex: pageIndex
          }
        }
      }
      return h
    })
    
    localStorage.setItem('chat-histories', JSON.stringify(updatedHistories))
  }

  // 处理转写结果
  const handleTranscript = (text: string, fileId?: string) => {
    console.log('收到转写结果:', { text, fileId })
    
    if (fileId) {
      // 处理文件上传的转写结果
      setFileQueue(prev => {
        const newQueue = prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            text, 
            status: 'completed' as const 
          } : f
        )

        // 如果是第一个完成的文件，自动切换到该文件的页面
        const completedFile = newQueue.find(f => f.id === fileId)
        if (completedFile) {
          const fileIndex = newQueue.indexOf(completedFile)
          setCurrentPageIndex(fileIndex)
          // 保存到本地存储
          saveToLocalStorage(text, newQueue, fileIndex)
        }

        return newQueue
      })

      setQueueProcessingState('idle')
    } else {
      // 处理录音的转写结果
      if (text) {
        setTranscribedText(text)
        setCurrentPageIndex(0)
        // 保存到本地存储
        saveToLocalStorage(text, fileQueue, 0)
      }
      setIsTranscribing(false)
    }
  }

  // 将文本分割成句子
  const splitIntoSentences = (text: string): Array<{
    id: string;
    content: string;
    timestamp: string;
  }> => {
    // 使用正则表达式匹配句子，包括标点符号
    const matches = text.match(/[^。！？.!?]+[。！？.!?]?/g) || []
    
    return matches
      .map((content, index) => ({
        id: `${index}`,
        content: content.trim(),
        timestamp: `${index + 1}. 00:00 - 00:00`
      }))
      .filter(item => item.content.length > 0)
  }

  // 处理句子编辑
  const handleEditSentence = (index: number, newContent: string) => {
    const currentContent = getCurrentPageContent()
    if (!currentContent.text) return

    const sentences = splitIntoSentences(currentContent.text)
    if (!sentences[index]) return

    let processedContent = newContent
    if (!processedContent.match(/[。！？.!?]$/)) {
      processedContent += '。'
    }

    sentences[index] = {
      ...sentences[index],
      content: processedContent
    }

    const newText = sentences.map(s => s.content).join('')
    
    if (fileQueue.length > 0) {
      setFileQueue(prev => {
        const newQueue = prev.map((f, idx) => 
          idx === currentPageIndex ? { ...f, text: newText } : f
        )
        // 保存到本地存储
        saveToLocalStorage(newText, newQueue, currentPageIndex)
        return newQueue
      })
    } else {
      setTranscribedText(newText)
      // 保存到本地存储
      saveToLocalStorage(newText, fileQueue, currentPageIndex)
    }
  }

  const speechRecognition = SpeechRecognition.getInstance(handleTranscript)

  // 使用 useEffect 监听队列状态变化
  useEffect(() => {
    if (queueProcessingState === 'idle') {
      const hasWaiting = fileQueue.some(f => f.status === 'waiting')
      if (hasWaiting) {
        setQueueProcessingState('processing')
        processFileQueue()
      }
    }
  }, [queueProcessingState, fileQueue])

  // 添加文件到队列
  const addToQueue = (files: File[]) => {
    const newFiles = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'waiting' as const,
      text: undefined
    }))

    setFileQueue(prev => [...prev, ...newFiles])
  }

  // 处理开始录音
  const handleStartRecording = async () => {
    try {
      setIsRecording(true)
      await speechRecognition.startRecording()
    } catch (error) {
      toast({
        title: "录音失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
      setIsRecording(false)
    }
  }

  // 处理停止录音
  const handleStopRecording = async () => {
    try {
      setIsRecording(false)
      setIsTranscribing(true)
      const audioBlob = await speechRecognition.stopRecording()
      await speechRecognition.handleRecordedAudio(audioBlob)
      setIsTranscribing(false)
    } catch (error) {
      toast({
        title: "处理录音失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
      setIsTranscribing(false)
    }
  }

  // 处理文件输入改变
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      addToQueue(files)
    }
  }

  // 处理拖拽事件
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  // 处理文件放下
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('audio/') || file.type.startsWith('video/')
    )

    if (files.length > 0) {
      addToQueue(files)
    } else {
      toast({
        title: "不支持的文件格式",
        description: "请上传音频或视频文件",
        variant: "destructive"
      })
    }
  }

  // 从队列中移除文件
  const handleRemoveFile = (id: string) => {
    setFileQueue(prev => prev.filter(f => f.id !== id))
  }

  // 导出为Word文档
  const handleExportToWord = async () => {
    const currentContent = getCurrentPageContent()
    if (!currentContent.text) {
      toast({
        title: "无法导出",
        description: "没有可导出的转录文本",
        variant: "destructive"
      })
      return
    }

    try {
      // 创建文档
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "语音转写结果",
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `导出时间：${new Date().toLocaleString()}`,
                  size: 24,
                  color: "666666",
                }),
              ],
            }),
            new Paragraph({}), // 空行
            new Paragraph({
              children: [
                new TextRun({
                  text: currentContent.text,
                  size: 24,
                }),
              ],
            }),
          ],
        }],
      })

      // 生成文档
      const blob = await Packer.toBlob(doc)
      
      // 下载文件
      const fileName = `语音转写结果_${new Date().toLocaleString().replace(/[/:]/g, '-')}.docx`
      saveAs(blob, fileName)

      toast({
        title: "导出成功",
        description: "文档已成功导出",
      })
    } catch (error) {
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
    }
  }

  // 处理文件上传队列
  const processFileQueue = async () => {
    // 检查是否有正在处理的文件
    const isProcessing = fileQueue.some(f => f.status === 'processing')
    if (isProcessing) {
      console.log('已有文件正在处理中，等待完成...')
      return
    }

    // 获取第一个等待处理的文件
    const currentFile = fileQueue.find(f => f.status === 'waiting')
    if (!currentFile) {
      console.log('没有待处理的文件，重置状态...')
      setIsTranscribing(false)
      setQueueProcessingState('idle')
      return
    }

    try {
      console.log('开始处理文件:', currentFile.file.name)
      // 更新状态为处理中
      setFileQueue(prev => prev.map(f => 
        f.id === currentFile.id ? { ...f, status: 'processing' as const } : f
      ))
      setIsTranscribing(true)

      // 使用全局实例处理文件
      await speechRecognition.uploadAudio(currentFile.file, currentFile.id)

    } catch (error) {
      console.error('处理文件错误:', error)
      // 更新状态为错误
      setFileQueue(prev => prev.map(f => 
        f.id === currentFile.id ? { 
          ...f, 
          status: 'error' as const,
          error: error instanceof Error ? error.message : "未知错误"
        } : f
      ))

      toast({
        title: "处理音频文件失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })

      // 出错时也要重置队列状态以继续处理下一个文件
      setQueueProcessingState('idle')
    }
  }

  // 重置所有状态
  const resetState = () => {
    setIsRecording(false)
    setTranscribedText("")
    setIsTranscribing(false)
    setDragActive(false)
    setFileQueue([])
    setQueueProcessingState('idle')
    setCurrentPageIndex(0)
  }

  // 监听路由变化
  useEffect(() => {
    // 当进入新建页面时重置状态
    if (pathname === '/chat/new') {
      resetState()
    }
  }, [pathname])

  return (
    <div className="flex-1 p-6">
      <div className="h-full flex flex-col gap-6">
        {/* 上方横向布局区域 */}
        <div className="flex gap-6">
          {/* 文件上传区域 */}
          <Card 
            className={`flex-1 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors relative h-[200px]
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="h-full flex flex-col">
              {fileQueue.length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {fileQueue.map((queuedFile) => (
                    <div 
                      key={queuedFile.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <File className="h-6 w-6 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{queuedFile.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(queuedFile.file.size / 1024 / 1024).toFixed(2)} MB
                            {queuedFile.status === 'waiting' && ' - 等待中'}
                            {queuedFile.status === 'processing' && ' - 处理中'}
                            {queuedFile.status === 'completed' && ' - 已完成'}
                            {queuedFile.status === 'error' && ` - 错误: ${queuedFile.error}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFile(queuedFile.id)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <p>点击或拖拽文件到此处上传</p>
                  <p className="text-sm">支持的格式：MP3, WAV, M4A, MP4, MOV等</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="audio/*,video/*"
              onChange={handleFileInputChange}
              multiple
            />
          </Card>

          {/* 录制按钮 */}
          <Card className="w-[200px] flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 p-5">
            <div className="flex flex-col items-center gap-4 w-full">
              <Button
                size="lg"
                className={`w-[120px] h-[120px] rounded-full transition-all duration-300 ${
                  isRecording 
                    ? "bg-red-500 hover:bg-red-600 animate-slow-pulse" 
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
              >
                <div className="flex flex-col items-center gap-2">
                  {isRecording ? (
                    <StopCircle className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </div>
              </Button>

              <div className="text-center">
                {isRecording ? (
                  <div className="flex flex-col items-center">
                    <span className="text-red-500 font-medium">录音中</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">点击开始录音</span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* 转写文本输出区域 */}
        <Card className="flex-1 p-6 rounded-xl h-[300px] relative">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              {fileQueue.length > 0 && `第 ${currentPageIndex + 1} 页，共 ${fileQueue.length} 页`}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handlePageChange('prev')}
                disabled={currentPageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handlePageChange('next')}
                disabled={currentPageIndex >= fileQueue.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="h-[calc(100%-3rem)] overflow-y-auto pr-2 custom-scrollbar">
            {(() => {
              const currentContent = getCurrentPageContent()
              
              if (currentContent.isProcessing) {
                return (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-lg">正在转录...</span>
                  </div>
                )
              }

              if (currentContent.text) {
                const sentences = splitIntoSentences(currentContent.text)
                return (
                  <div className="space-y-2">
                    {sentences.map(({ id, content, timestamp }) => (
                      <SentenceBlock
                        key={id}
                        content={content}
                        timestamp={timestamp}
                        onEdit={(newContent) => handleEditSentence(parseInt(id), newContent)}
                      />
                    ))}
                  </div>
                )
              }

              return (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  转写的文本将显示在这里
                </div>
              )
            })()}
          </div>

          {/* 导出按钮 */}
          {getCurrentPageContent().text && !getCurrentPageContent().isProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-4 right-4"
            >
              <Button
                variant="secondary"
                className="gap-2"
                onClick={handleExportToWord}
              >
                <FileDown className="h-4 w-4" />
                导出为Word
              </Button>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  )
} 