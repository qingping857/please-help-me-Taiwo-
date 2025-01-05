import { XunfeiASR } from './xunfei'

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm',
  })
  
  const chunks: Blob[] = []
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  mediaRecorder.start(1000) // 每秒触发一次 ondataavailable
  return {
    mediaRecorder,
    stop: async () => {
      return new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          stream.getTracks().forEach(track => track.stop())
          resolve(audioBlob)
        }
        mediaRecorder.stop()
      })
    }
  }
}

interface TranscriptionOptions {
  language?: string
  prompt?: string
  temperature?: number
}

export async function* transcribeAudio(audioBlob: Blob, options: TranscriptionOptions = {}) {
  let currentText = ''
  let isFirstChunk = true

  const xunfei = new XunfeiASR(
    (text: string, isAppend: boolean) => {
      // 如果是追加模式，保留之前的文本
      currentText = isAppend ? currentText + text : text
    },
    (error: Error) => {
      console.error('讯飞服务错误:', error)
      throw error
    }
  )

  try {
    // 连接讯飞服务
    await xunfei.connect()

    // 发送音频数据
    await xunfei.sendAudioData(audioBlob)

    // 每50ms检查一次文本更新
    while (true) {
      if (currentText) {
        yield currentText
      }
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  } catch (error) {
    console.error('转录过程出错:', error)
    throw error
  } finally {
    xunfei.close()
  }
} 