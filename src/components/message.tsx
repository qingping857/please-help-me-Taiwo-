import { cn } from '@/lib/utils'

interface MessageProps {
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
}

export function Message({ role, content, audioUrl }: MessageProps) {
  return (
    <div
      className={cn(
        'flex w-full items-start gap-4 p-4',
        role === 'assistant' ? 'bg-muted/50' : 'bg-white'
      )}
    >
      <div className="flex-1 space-y-2">
        <div className="prose break-words">
          {role === 'user' && audioUrl && (
            <audio
              src={audioUrl}
              controls
              className="mb-2 w-full max-w-[300px]"
            />
          )}
          <p>{content}</p>
        </div>
      </div>
    </div>
  )
} 