'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { AliyunASR } from '@/lib/aliyun'
import { AudioProcessor } from '@/lib/audio-processor'
import { initConfig } from '@/lib/config'

interface RecorderState {
  isRecording: boolean
  duration: number
  error: string | null
}

export function useAliyunRecorder(onTranscript: (text: string) => void) {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    duration: 0,
    error: null
  })

  const [isInitialized, setIsInitialized] = useState(false)
  const asr = useRef<AliyunASR | null>(null)
  const audioProcessor = useRef<AudioProcessor | null>(null)
  const mediaStream = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 初始化配置
  useEffect(() => {
    initConfig()
      .then(() => {
        setIsInitialized(true)
      })
      .catch(error => {
        console.error('初始化配置失败:', error)
        setState(prev => ({ ...prev, error: '初始化配置失败' }))
      })
  }, [])

  // 处理音频数据
  const handleAudioData = useCallback(async (audioData: Float32Array) => {
    if (!asr.current) return

    try {
      const pcm16 = AudioProcessor.float32ToPCM16(audioData)
      const blob = AudioProcessor.pcm16ToBlob(pcm16)
      await asr.current.sendAudioData(blob)
    } catch (error) {
      console.error('发送音频数据失败:', error)
      if (error instanceof Error) {
        setState(prev => ({ ...prev, error: error.message }))
      }
    }
  }, [])

  // 处理转录结果
  const handleTranscript = useCallback((text: string) => {
    onTranscript(text)
  }, [onTranscript])

  // 处理错误
  const handleError = useCallback((error: any) => {
    console.error('识别错误:', error)
    setState(prev => ({ ...prev, error: error instanceof Error ? error.message : '识别出错' }))
    stopRecording()
  }, [])

  // 停止录音
  const stopRecording = useCallback(async () => {
    // 停止计时
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // 停止音频处理
    if (audioProcessor.current) {
      audioProcessor.current.stop()
      audioProcessor.current = null
    }

    // 停止语音识别
    if (asr.current) {
      asr.current.stopRecognition()
      asr.current = null
    }

    // 停止媒体流
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop())
      mediaStream.current = null
    }

    setState(prev => ({ 
      ...prev, 
      isRecording: false 
    }))
  }, [])

  // 开始录音
  const startRecording = useCallback(async () => {
    if (!isInitialized) {
      setState(prev => ({ ...prev, error: '配置未初始化' }))
      return
    }

    try {
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        error: null,
        duration: 0
      }))

      // 获取麦克风权限
      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      // 创建语音识别实例并等待连接建立
      asr.current = new AliyunASR(handleTranscript, handleError)
      await asr.current.startRecognition()

      // WebSocket 连接建立后，再开始处理音频
      audioProcessor.current = new AudioProcessor(handleAudioData, 16000)
      await audioProcessor.current.start(mediaStream.current)

      // 开始计时
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
      // 清理资源
      await stopRecording()
    }
  }, [handleAudioData, handleTranscript, handleError, isInitialized, stopRecording])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [stopRecording])

  return {
    ...state,
    isInitialized,
    startRecording,
    stopRecording
  }
} 