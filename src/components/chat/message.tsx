'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface MessageProps {
  content: string
  isUser: boolean
  audioUrl?: string
}

export function Message({ content, isUser, audioUrl }: MessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex w-full gap-4 p-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-2 rounded-lg p-4',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {audioUrl && (
          <audio controls className="max-w-full">
            <source src={audioUrl} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        )}
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    </motion.div>
  )
} 