import { useCallback, useRef, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Mic, MicOff, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSubmit: (file: File) => Promise<void>
  isLoading?: boolean
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        await onSubmit(file)
        event.target.value = ''
      }
    },
    [onSubmit]
  )

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file && file.type.startsWith('audio/')) {
        await onSubmit(file)
      }
    },
    [onSubmit]
  )

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], 'recording.webm', {
          type: 'audio/webm',
        })
        await onSubmit(audioFile)
        audioChunks.current = []
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error('录音失败:', error)
    }
  }, [onSubmit])

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach((track) => track.stop())
      setMediaRecorder(null)
      setIsRecording(false)
    }
  }, [mediaRecorder])

  return (
    <div
      className="flex items-center gap-2 p-4"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <Input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading || isRecording}
      >
        <Upload className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className={cn(isRecording && 'bg-red-100')}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isLoading}
      >
        {isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      <div className="flex-1 rounded-md border bg-muted px-4 py-2 text-sm text-muted-foreground">
        拖放音频文件到这里，或点击上传/录音按钮
      </div>
    </div>
  )
} 