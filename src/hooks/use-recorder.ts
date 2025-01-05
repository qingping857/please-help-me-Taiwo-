'use client'

import { useState, useCallback } from 'react'
import { startRecording } from '@/lib/whisper'

export function useRecorder(onStop: (blob: Blob) => void) {
  const [isRecording, setIsRecording] = useState(false)
  const [recorder, setRecorder] = useState<{ stop: () => Promise<Blob> } | null>(null)

  const startRecordingHandler = useCallback(async () => {
    try {
      const newRecorder = await startRecording()
      setRecorder(newRecorder)
      setIsRecording(true)
    } catch (error) {
      console.error('启动录音失败:', error)
      alert('启动录音失败，请检查麦克风权限')
    }
  }, [])

  const stopRecordingHandler = useCallback(async () => {
    if (!recorder) return

    try {
      const audioBlob = await recorder.stop()
      setIsRecording(false)
      setRecorder(null)
      onStop(audioBlob)
    } catch (error) {
      console.error('停止录音失败:', error)
      alert('停止录音失败，请重试')
    }
  }, [recorder, onStop])

  return {
    isRecording,
    startRecording: startRecordingHandler,
    stopRecording: stopRecordingHandler,
  }
} 