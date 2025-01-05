import { useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Mic, Square, Upload } from 'lucide-react'

interface ChatInputProps {
  onFileUpload: (file: File) => Promise<void>
  onStartRecording: () => Promise<void>
  onStopRecording: () => void
  isLoading: boolean
}

export function ChatInput({ 
  onFileUpload, 
  onStartRecording, 
  onStopRecording, 
  isLoading 
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await onFileUpload(file)
      event.target.value = ''
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) {
      await onFileUpload(file)
    }
  }

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
        disabled={isLoading}
      >
        <Upload className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onStartRecording}
        disabled={isLoading}
      >
        <Mic className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onStopRecording}
        disabled={!isLoading}
      >
        <Square className="h-4 w-4" />
      </Button>
      <div className="flex-1 rounded-md border bg-muted px-4 py-2 text-sm text-muted-foreground">
        拖放音频文件到这里，或点击上传/录音按钮
      </div>
    </div>
  )
} 