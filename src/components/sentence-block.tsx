import { useState, useEffect, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface SentenceBlockProps {
  timestamp: string
  content: string
  onEdit: (newContent: string) => void
}

export function SentenceBlock({ timestamp, content, onEdit }: SentenceBlockProps) {
  const [editedContent, setEditedContent] = useState(content)
  const [textareaHeight, setTextareaHeight] = useState(40)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${scrollHeight}px`
      setTextareaHeight(scrollHeight)
    }
  }, [editedContent])

  return (
    <div className="flex gap-4 p-2">
      {/* 时间轴 */}
      <div 
        className="w-[200px] flex-shrink-0 border rounded-md p-2 text-sm text-muted-foreground"
        style={{ minHeight: `${textareaHeight}px` }}
      >
        {timestamp}
      </div>

      {/* 句子内容 */}
      <div className="flex-1">
        <Textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => {
            setEditedContent(e.target.value)
            onEdit(e.target.value)
          }}
          className="w-full resize-none overflow-hidden"
          style={{ height: `${textareaHeight}px` }}
        />
      </div>
    </div>
  )
} 