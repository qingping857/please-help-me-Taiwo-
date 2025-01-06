export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  isTranscribing?: boolean
}

export interface TranscriptResult {
  text: string
  status: 'completed' | 'error' | 'processing'
  error?: string
} 