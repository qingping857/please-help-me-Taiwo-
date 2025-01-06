'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, StopCircle, Upload, File, X, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { SpeechRecognition } from "@/lib/speech-recognition"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"

interface QueuedFile {
  id: string
  file: File
  status: 'waiting' | 'processing' | 'completed' | 'error'
  text: string | undefined
  error?: string
}

export function MainContent() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcribedText, setTranscribedText] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([])
  const [queueProcessingState, setQueueProcessingState] = useState<'idle' | 'processing'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  // 处理文件上传队列
  const processFileQueue = async () => {
    // 检查是否有正在处理的文件
    const isProcessing = fileQueue.some(f => f.status === 'processing')
    if (isProcessing) return

    // 获取第一个等待处理的文件
    const currentFile = fileQueue.find(f => f.status === 'waiting')
    if (!currentFile) {
      setIsTranscribing(false)
      setQueueProcessingState('idle')
      return
    }

    try {
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

      // 出错时也要更新队列状态
      setQueueProcessingState('idle')
    }
  }

  // 处理转写结果
  const handleTranscript = (text: string, fileId?: string) => {
    console.log('收到转写结果:', { text, fileId })
    
    if (fileId) {
      setFileQueue(prev => {
        // 更新当前文件的状态和文本
        const newQueue = prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            text, 
            status: 'completed' as const 
          } : f
        )

        // 获取所有已完成的文件文本
        const completedTexts = newQueue
          .filter(f => f.status === 'completed' || f.id === fileId)
          .map(f => {
            const fileText = f.id === fileId ? text : f.text
            return `${f.file.name}:\n${fileText}`
          })

        // 更新显示文本
        setTranscribedText(completedTexts.join('\n\n'))

        // 检查是否还有等待的文件
        const hasMore = newQueue.some(f => f.status === 'waiting')
        if (!hasMore) {
          setIsTranscribing(false)
          setQueueProcessingState('idle')
        }

        return newQueue
      })
    } else {
      // 这是录音的情况，直接更新显示文本
      setTranscribedText(text)
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
          <Card className="w-[200px] flex items-center justify-center rounded-xl">
            <Button
              size="lg"
              className={`w-[160px] h-[160px] rounded-xl ${
                isRecording 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
            >
              <div className="flex flex-col items-center gap-2">
                {isRecording ? (
                  <>
                    <StopCircle className="h-8 w-8" />
                    <span>停止录音</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-8 w-8" />
                    <span>开始录音</span>
                  </>
                )}
              </div>
            </Button>
          </Card>
        </div>

        {/* 转写文本输出区域 */}
        <Card className="flex-1 p-6 rounded-xl h-[300px]">
          {isTranscribing ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-8 w-8" />
              </motion.div>
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                正在处理音频文件...
              </motion.p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto pr-2 custom-scrollbar">
              {transcribedText ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="whitespace-pre-wrap break-words"
                >
                  {transcribedText}
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  转写的文本将显示在这里
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
} 