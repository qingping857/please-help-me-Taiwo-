'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Send, Square } from 'lucide-react'
import { useRecorder } from '@/hooks/use-recorder'

interface ChatInputProps {
  onSendAudio: (file: File) => void
  onSendFile: (file: File) => void
}

export function ChatInput({ onSendAudio, onSendFile }: ChatInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleAudioData = useCallback(
    (blob: Blob) => {
      const file = new File([blob], `recording-${Date.now()}.wav`, {
        type: 'audio/wav',
      })
      onSendAudio(file)
    },
    [onSendAudio]
  )

  const recorder = useRecorder(handleAudioData)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const audioFile = files.find((file) =>
      file.type.startsWith('audio/')
    )

    if (audioFile) {
      onSendFile(audioFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const audioFile = files.find((file) =>
      file.type.startsWith('audio/')
    )

    if (audioFile) {
      onSendFile(audioFile)
    }

    // 重置 input 值，允许选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="border-t bg-background p-4">
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center gap-2 rounded-lg border p-4 ${
          isDragging ? 'border-primary' : 'border-input'
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10">
            <p className="text-sm">拖放音频文件到这里</p>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          variant="outline"
          size="icon"
          onClick={handleUploadClick}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>

        <Button
          variant={recorder.isRecording ? 'destructive' : 'outline'}
          size="icon"
          onClick={
            recorder.isRecording
              ? recorder.stopRecording
              : recorder.startRecording
          }
          className="shrink-0"
        >
          {recorder.isRecording ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {recorder.isRecording
              ? `录音中... ${recorder.duration}s`
              : '点击按钮开始录音，或拖放音频文件到这里'}
          </p>
        </div>
      </div>
    </div>
  )
} 