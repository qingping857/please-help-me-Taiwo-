import { cn } from '@/lib/utils'

interface MessageProps {
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
}

export function Message({ role, content, audioUrl }: MessageProps) {
  const isUser = role === 'user'
  
  return (
    <div
      className={cn(
        'flex w-full items-start gap-4 p-4',
        isUser ? 'bg-white justify-end' : 'bg-muted/50'
      )}
    >
      <div
        className={cn(
          'flex-1 space-y-2 max-w-3xl',
          isUser && 'flex flex-col items-end'
        )}
      >
        <div
          className={cn(
            'break-words rounded-lg p-3',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-background'
          )}
        >
          {isUser && audioUrl && (
            <div className="mb-2">
              <audio
                src={audioUrl}
                controls
                className="w-full max-w-[300px] [&::-webkit-media-controls-panel]:!bg-primary-foreground/10"
              />
            </div>
          )}
          <p className="m-0 text-base leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  )
} 