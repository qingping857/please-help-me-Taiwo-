const DEER_API_URL = 'https://api.deerapi.com/v1/audio/transcriptions'

// 重试配置
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2秒

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function retryFetch(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`尝试请求 ${url}，第 ${i + 1} 次...`)
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${text}`)
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('未知错误')
      console.error(`第 ${i + 1} 次请求失败:`, lastError)
      
      if (i < retries - 1) {
        console.log(`等待 ${RETRY_DELAY/1000} 秒后重试...`)
        await sleep(RETRY_DELAY)
      }
    }
  }

  throw new Error(`请求失败，已重试 ${retries} 次: ${lastError?.message}`)
}

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
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
  temperature?: number
}

export async function* transcribeAudio(audioBlob: Blob, options: TranscriptionOptions = {}) {
  console.log('准备转录音频...', {
    type: audioBlob.type,
    size: audioBlob.size,
    name: audioBlob instanceof File ? (audioBlob as File).name : undefined
  })

  // 如果文件太大，可以考虑分片处理
  if (audioBlob.size > 10 * 1024 * 1024) { // 10MB
    console.log('文件较大，可能需要较长处理时间...')
  }

  const formData = new FormData()
  
  // 文件必须作为第一个字段
  if (audioBlob instanceof File) {
    formData.append('file', audioBlob)
  } else {
    formData.append('file', audioBlob, 'recording.webm')
  }
  
  // 必需的字段
  formData.append('model', 'whisper-1')
  
  // 可选字段
  if (options.language) {
    formData.append('language', options.language)
  }
  
  if (options.prompt) {
    formData.append('prompt', options.prompt)
  }
  
  formData.append('response_format', options.response_format || 'verbose_json')
  
  if (typeof options.temperature === 'number') {
    formData.append('temperature', options.temperature.toString())
  }

  console.log('发送转录请求...', {
    language: options.language || 'zh',
    response_format: options.response_format || 'verbose_json',
    temperature: options.temperature,
    prompt: options.prompt
  })

  try {
    const response = await retryFetch('/api/whisper', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`转录请求失败: ${response.status} ${response.statusText}\n${errorText}`)
    }

    const data = await response.json()
    console.log('收到转录响应:', data)

    if (data.error) {
      throw new Error(data.error)
    }

    // 处理响应数据
    if (data.segments) {
      // 按段落处理
      for (const segment of data.segments) {
        if (segment.text) {
          const text = segment.text.trim()
          // 将文本按标点符号分割
          const sentences = text.match(/[^，。！？,.!?]+[，。！？,.!?]?/g) || [text]
          
          for (const sentence of sentences) {
            // 将句子按字符分割
            const chars = Array.from(sentence)
            let partial = ''
            
            // 逐字输出
            for (const char of chars) {
              partial += char
              yield partial
              // 添加一个小延迟，模拟打字效果
              await sleep(50)
            }
          }
        }
      }
    } else if (data.text) {
      const text = data.text.trim()
      // 将文本按标点符号分割
      const sentences = text.match(/[^，。！？,.!?]+[，。！？,.!?]?/g) || [text]
      
      for (const sentence of sentences) {
        // 将句子按字符分割
        const chars = Array.from(sentence)
        let partial = ''
        
        // 逐字输出
        for (const char of chars) {
          partial += char
          yield partial
          // 添加一个小延迟，模拟打字效果
          await sleep(50)
        }
      }
    } else {
      throw new Error('响应中没有文本内容')
    }
  } catch (error) {
    console.error('转录过程出错:', error)
    throw error
  }
} 