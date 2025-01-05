'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface MessageProps {
  content: string
  isUser: boolean
  audioUrl?: string
  isTranscribing?: boolean
}

export function Message({ content, isUser, audioUrl, isTranscribing }: MessageProps) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary' : 'bg-secondary'
        }`}>
          {isUser ? '我' : 'AI'}
        </div>
        <div className={`rounded-lg p-4 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-secondary text-secondary-foreground'
        }`}>
          {audioUrl ? (
            <audio 
              src={audioUrl} 
              controls 
              className="max-w-full" 
              controlsList="nodownload"
            />
          ) : (
            <div className="whitespace-pre-wrap">
              {content}
              {isTranscribing && (
                <span className="ml-2 animate-pulse">▋</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 