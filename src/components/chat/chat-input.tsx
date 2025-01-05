'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Send, Square } from 'lucide-react'
import { useRecorder } from '@/hooks/use-recorder'

// 支持的音频格式
const ACCEPT_AUDIO_FORMATS = [
  'audio/mpeg',  // MP3
  'audio/mp4',   // MP4
  'audio/wav',   // WAV
  'audio/webm',  // WebM
  'audio/x-m4a', // M4A
  'audio/aac',   // AAC
  'audio/ogg'    // OGG
]

// 文件选择器支持的格式
const ACCEPT_FILE_TYPES = '.mp3,.mp4,.m4a,.wav,.webm,.aac,.ogg'

// 最大文件大小 (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024

interface ChatInputProps {
  onSendAudio: (blob: Blob) => void
  onSendFile: (file: File) => void
}

export function ChatInput({ onSendAudio, onSendFile }: ChatInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const recorder = useRecorder(onSendAudio)

  const validateAudioFile = (file: File): string | null => {
    console.log('验证音频文件:', {
      name: file.name,
      type: file.type,
      size: file.size
    })
    
    if (!ACCEPT_AUDIO_FORMATS.some(format => file.type.startsWith(format))) {
      return '不支持的音频格式。支持的格式包括: MP3, MP4, M4A, WAV, WebM, AAC, OGG'
    }
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小超过25MB限制'
    }
    return null
  }

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
      ACCEPT_AUDIO_FORMATS.some(format => file.type.startsWith(format))
    )

    if (audioFile) {
      const error = validateAudioFile(audioFile)
      if (error) {
        alert(error)
        return
      }
      onSendFile(audioFile)
    } else {
      alert('请上传支持的音频文件格式')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const audioFile = files.find((file) =>
      ACCEPT_AUDIO_FORMATS.some(format => file.type.startsWith(format))
    )

    if (audioFile) {
      const error = validateAudioFile(audioFile)
      if (error) {
        alert(error)
        return
      }
      onSendFile(audioFile)
    } else {
      alert('请上传支持的音频文件格式')
    }

    // 重置 input 值，允许选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex w-full items-center gap-2 rounded-lg border bg-background p-4 ${
        isDragging ? 'border-primary' : 'border-input'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_FILE_TYPES}
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        <Send className="h-5 w-5" />
      </Button>

      <Button
        variant={recorder.isRecording ? 'destructive' : 'ghost'}
        size="icon"
        type="button"
        onClick={recorder.isRecording ? recorder.stopRecording : recorder.startRecording}
      >
        {recorder.isRecording ? (
          <Square className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>

      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10">
          <p className="text-sm text-muted-foreground">
            拖放音频文件到这里
          </p>
        </div>
      )}
    </div>
  )
} 