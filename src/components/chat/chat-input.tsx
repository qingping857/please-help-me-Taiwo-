'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Upload, Square } from 'lucide-react'
import { isFormatSupported } from '@/lib/config'

interface ChatInputProps {
  onSendAudio: () => Promise<void>
  onSendFile: (file: File) => Promise<void>
  onStopRecording: () => Promise<void>
  isRecording: boolean
}

export function ChatInput({ onSendAudio, onSendFile, onStopRecording, isRecording }: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!isFormatSupported(file.name)) {
        alert('不支持的文件格式')
        return
      }
      await onSendFile(file)
      // 清空文件输入，以便可以重复上传相同的文件
      e.target.value = ''
    }
  }

  const handleRecordClick = async () => {
    console.log('=== handleRecordClick ===')
    console.log('isRecording:', isRecording)
    
    try {
      if (isRecording) {
        console.log('调用 onStopRecording')
        await onStopRecording()
      } else {
        console.log('调用 onSendAudio')
        await onSendAudio()
      }
    } catch (error) {
      console.error('录音操作失败:', error)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="audio/*,video/*"
        onChange={handleFileChange}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleFileClick}
        className="h-9 w-9"
      >
        <Upload className="h-5 w-5" />
      </Button>
      <Button
        variant={isRecording ? 'destructive' : 'ghost'}
        size="icon"
        onClick={handleRecordClick}
        className="h-9 w-9"
      >
        {isRecording ? (
          <Square className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
    </div>
  )
} 