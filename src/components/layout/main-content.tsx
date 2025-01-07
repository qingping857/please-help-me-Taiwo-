'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, StopCircle, Upload, File, X, Loader2, FileDown, Pencil } from "lucide-react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { SpeechRecognition } from "@/lib/speech-recognition"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { useRouter, usePathname } from "next/navigation"
import { getHistories, saveHistories, renameHistory, getHistory, updateHistory } from "@/lib/history"
import type { HistoryItem } from "@/lib/history"
import { Input } from "@/components/ui/input"
import { SentenceBlock } from "@/components/sentence-block"

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
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [currentHistory, setCurrentHistory] = useState<HistoryItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 重置所有状态
  const resetState = useCallback(() => {
    setIsRecording(false)
    setTranscribedText("")
    setIsTranscribing(false)
    setDragActive(false)
    setFileQueue([])
    setQueueProcessingState('idle')
    setCurrentHistory(null)
    setNewTitle('')
  }, [])

  // 加载当前历史记录
  useEffect(() => {
    if (chatId) {
      const history = getHistory(chatId)
      if (history) {
        setCurrentHistory(history)
        setNewTitle(history.title)
        
        if (history.content) {
          // 确保文件队列的深拷贝，避免状态共享
          const newFileQueue = JSON.parse(JSON.stringify(history.content.fileQueue || []))
          setFileQueue(newFileQueue)
          setTranscribedText(history.content.text || '')
        }
      } else {
        console.warn('找不到历史记录:', chatId)
        router.replace('/chat/new')
      }
    }
  }, [chatId, router])

  // 保存内容到本地存储
  const saveToLocalStorage = useCallback(() => {
    if (!chatId || !currentHistory) return
    
    const content = {
      text: transcribedText,
      fileQueue
    }
    
    updateHistory(chatId, {
      content
    })
  }, [chatId, currentHistory, transcribedText, fileQueue])

  // 处理转写结果
  const handleTranscript = useCallback((text: string, fileId?: string) => {
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
        return newQueue
      })
      setQueueProcessingState('idle')
    } else {
      // 处理录音的转写结果
      if (text) {
        const recordingFile: QueuedFile = {
          id: `recording_${Date.now()}`,
          file: new window.File([], "录音文件.webm", { type: 'audio/webm' }),
          status: 'completed',
          text
        }
        setFileQueue(prev => [...prev, recordingFile])
      }
      setIsTranscribing(false)
    }

    // 保存到本地存储
    setTimeout(() => saveToLocalStorage(), 0)
  }, [saveToLocalStorage])

  // 将文本分割成句子
  const splitIntoSentences = (text: string, prefix: string = ''): Array<{
    id: string;
    content: string;
    timestamp: string;
  }> => {
    // 按标点符号分割句子（支持阿拉伯语和英语的标点符号）
    const matches = text.match(/[^。！？.!?؟]+[。！？.!?؟]?/g) || []
    
    // 假设每个字的平均发音时长为0.3秒
    const CHAR_DURATION = 0.3
    let currentTime = 0
    
    // 可选的切割长度
    const CHUNK_LENGTHS = [20, 25, 30, 40]
    
    // 进一步处理句子
    const sentences = matches.flatMap((sentence, index) => {
      const trimmedSentence = sentence.trim()
      
      // 如果句子长度超过最大允许长度，需要进一步分割
      if (trimmedSentence.length > Math.max(...CHUNK_LENGTHS)) {
        const chunks: string[] = []
        let currentChunk = ''
        
        // 按字符分割句子
        for (let char of trimmedSentence) {
          // 随机选择一个切割长度
          const randomLength = CHUNK_LENGTHS[Math.floor(Math.random() * CHUNK_LENGTHS.length)]
          
          if (currentChunk.length >= randomLength) {
            // 当前块已满，添加到结果中
            chunks.push(currentChunk + (char.match(/[。！？.!?؟]/) ? '' : '。'))
            currentChunk = char
          } else {
            currentChunk += char
          }
        }
        
        // 处理最后一个块
        if (currentChunk) {
          chunks.push(currentChunk + (currentChunk.match(/[。！？.!?؟]$/) ? '' : '。'))
        }
        
        // 为每个块创建句子对象
        return chunks.map((chunk, chunkIndex) => {
          const startTime = currentTime
          const duration = chunk.length * CHAR_DURATION
          currentTime = startTime + duration
          
          const startTimeStr = formatTime(startTime)
          const endTimeStr = formatTime(currentTime)
          
          return {
            id: `${prefix}_${Math.random().toString(36).substring(2)}_${index}_${chunkIndex}`,
            content: chunk,
            timestamp: `${index + 1}.${chunkIndex + 1}. ${startTimeStr} - ${endTimeStr}`
          }
        })
      }
      
      // 如果句子长度不超过最大允许长度，直接返回
      const startTime = currentTime
      const duration = trimmedSentence.length * CHAR_DURATION
      currentTime = startTime + duration
      
      const startTimeStr = formatTime(startTime)
      const endTimeStr = formatTime(currentTime)
      
      return [{
        id: `${prefix}_${Math.random().toString(36).substring(2)}_${index}`,
        content: trimmedSentence,
        timestamp: `${index + 1}. ${startTimeStr} - ${endTimeStr}`
      }]
    })
    
    return sentences.filter(item => item.content.length > 0)
  }

  // 格式化时间为 mm:ss 格式
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // 处理句子编辑
  const handleEditSentence = useCallback((id: string, newContent: string) => {
    const sentences = splitIntoSentences(transcribedText, 'edit')
    const sentenceIndex = sentences.findIndex(s => s.id === id)
    if (sentenceIndex === -1) return

    let processedContent = newContent
    if (!processedContent.match(/[。！？.!?]$/)) {
      processedContent += '。'
    }

    sentences[sentenceIndex] = {
      ...sentences[sentenceIndex],
      content: processedContent
    }

    const newText = sentences.map(s => s.content).join('')
    setTranscribedText(newText)
    saveToLocalStorage()
  }, [transcribedText, saveToLocalStorage])

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
      const audioBlob = await speechRecognition.stopRecording()
      
      // 创建录音文件并添加到队列
      const recordingFile = new window.File([audioBlob], "录音文件.webm", { 
        type: 'audio/webm'
      })
      
      const newFile: QueuedFile = {
        id: Math.random().toString(36).substr(2, 9),
        file: recordingFile,
        status: 'waiting',
        text: undefined
      }
      
      setFileQueue(prev => [...prev, newFile])
      await speechRecognition.uploadAudio(recordingFile, newFile.id)
      
    } catch (error) {
      toast({
        title: "处理录音失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      })
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
    // 合并所有文本
    const allTexts = [
      transcribedText,
      ...fileQueue
        .filter(f => f.text && f.status === 'completed')
        .map(f => f.text)
    ].filter(Boolean)

    if (allTexts.length === 0) {
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
                  text: allTexts.join('\n\n'),
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
      setQueueProcessingState('idle')
      return
    }

    try {
      console.log('开始处理文件:', currentFile.file.name)
      // 更新状态为处理中
      setFileQueue(prev => prev.map(f => 
        f.id === currentFile.id ? { ...f, status: 'processing' as const } : f
      ))

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

  // 监听路由变化
  useEffect(() => {
    // 当进入新建页面时重置状态
    if (pathname === '/chat/new') {
      resetState()
    }
  }, [pathname, resetState])

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
          {/* 状态提示 */}
          {fileQueue.length > 0 && (
            <div className="absolute top-4 right-4 text-sm text-muted-foreground animate-fade-in">
              {(() => {
                const completedCount = fileQueue.filter(f => f.status === 'completed').length
                const processingFile = fileQueue.find(f => f.status === 'processing')
                if (processingFile) {
                  const currentIndex = fileQueue.indexOf(processingFile) + 1
                  return `第${currentIndex}个文件正在转录中...`
                }
                if (completedCount === fileQueue.length) {
                  return `全部${fileQueue.length}个文件已转录完成`
                }
                return `已完成${completedCount}/${fileQueue.length}个文件`
              })()}
            </div>
          )}

          <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
            {(() => {
              // 只在第一个文件处理且没有任何完成的文件时，显示加载状态
              const showLoadingState = fileQueue.length > 0 && 
                fileQueue[0].status === 'processing' &&
                !fileQueue.some(f => f.status === 'completed')

              if (showLoadingState) {
                return (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-lg">正在转录第一个文件...</span>
                  </div>
                )
              }

              // 收集所有已完成的文本
              const completedTexts: Array<{
                id: string;
                content: string;
                timestamp: string;
              }> = []
              
              // 按照队列顺序添加已完成文件的文本
              fileQueue.forEach((f, index) => {
                if (f.text && f.status === 'completed') {
                  completedTexts.push(...splitIntoSentences(f.text, `file_${index}`))
                }
              })

              if (completedTexts.length > 0) {
                return (
                  <div className="space-y-2">
                    {completedTexts.map(({ id, content, timestamp }) => (
                      <SentenceBlock
                        key={id}
                        content={content}
                        timestamp={timestamp}
                        onEdit={(newContent) => handleEditSentence(id, newContent)}
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
          {fileQueue.some(f => f.text && f.status === 'completed') && (
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