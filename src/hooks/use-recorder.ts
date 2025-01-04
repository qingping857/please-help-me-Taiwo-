'use client'

import { useState, useRef, useCallback } from 'react'

interface RecorderState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  error: string | null
}

export function useRecorder(onDataAvailable: (blob: Blob) => void) {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null
  })

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const mediaStream = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const chunks = useRef<Blob[]>([])

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && state.isRecording) {
      mediaRecorder.current.stop()
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop())
      mediaStream.current = null
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false
    }))
  }, [state.isRecording])

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      chunks.current = []
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        error: null,
        duration: 0
      }))

      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      mediaRecorder.current = new MediaRecorder(mediaStream.current)

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data)
          onDataAvailable(e.data)
        }
      }

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' })
        onDataAvailable(blob)
        chunks.current = []
      }

      mediaRecorder.current.start(1000)

      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)

    } catch (error) {
      console.error('启动录音失败:', error)
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: error instanceof Error ? error.message : '启动录音失败'
      }))
      stopRecording()
    }
  }, [onDataAvailable, stopRecording])

  // 暂停录音
  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current && state.isRecording && !state.isPaused) {
      mediaRecorder.current.pause()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setState(prev => ({ ...prev, isPaused: true }))
    }
  }, [state.isRecording, state.isPaused])

  // 恢复录音
  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current && state.isRecording && state.isPaused) {
      mediaRecorder.current.resume()
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
      setState(prev => ({ ...prev, isPaused: false }))
    }
  }, [state.isRecording, state.isPaused])

  // 获取录音数据
  const getAudioBlob = useCallback(async (): Promise<Blob | null> => {
    if (chunks.current.length === 0) return null
    return new Blob(chunks.current, { type: 'audio/webm' })
  }, [])

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getAudioBlob
  }
} 