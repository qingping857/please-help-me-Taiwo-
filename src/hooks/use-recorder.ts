'use client'

import { useState, useCallback, useRef } from 'react'

interface RecorderState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioUrl: string | null
}

export function useRecorder(onDataAvailable?: (blob: Blob) => void) {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioUrl: null,
  })

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout>()

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      audioChunks.current = []

      // 每秒获取一次音频数据
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data)
          // 如果提供了回调函数，则调用它
          onDataAvailable?.(event.data)
        }
      }

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setState(prev => ({ ...prev, audioUrl }))
      }

      mediaRecorder.current.start(1000) // 每秒触发一次 ondataavailable
      setState(prev => ({ ...prev, isRecording: true, isPaused: false }))

      // 开始计时
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }, [onDataAvailable])

  // 暂停录音
  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.pause()
      clearInterval(timerRef.current)
      setState(prev => ({ ...prev, isPaused: true }))
    }
  }, [])

  // 恢复录音
  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current?.state === 'paused') {
      mediaRecorder.current.resume()
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }))
      }, 1000)
      setState(prev => ({ ...prev, isPaused: false }))
    }
  }, [])

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop()
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop())
      clearInterval(timerRef.current)
      setState(prev => ({ ...prev, isRecording: false, isPaused: false }))
    }
  }, [])

  // 重置录音
  const resetRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioUrl: null,
    })
    audioChunks.current = []
  }, [state.audioUrl])

  // 获取录音数据
  const getAudioBlob = useCallback(async () => {
    if (audioChunks.current.length === 0) return null
    return new Blob(audioChunks.current, { type: 'audio/webm' })
  }, [])

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    getAudioBlob,
  }
} 