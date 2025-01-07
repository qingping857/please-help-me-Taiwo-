import { AssemblyAI, TranscriptParams } from 'assemblyai'
import { ASSEMBLYAI_API_KEY, speechRecognitionConfig } from './assemblyai'
import { isFormatSupported, getFileType, getConfig } from '@/lib/config'

export class SpeechRecognition {
  private onTranscript: (text: string, fileId?: string) => void
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private client: AssemblyAI
  private static instance: SpeechRecognition | null = null

  private constructor(onTranscript: (text: string, fileId?: string) => void) {
    this.onTranscript = onTranscript
    if (!ASSEMBLYAI_API_KEY) {
      throw new Error('AssemblyAI API Key is not configured')
    }
    this.client = new AssemblyAI({
      apiKey: ASSEMBLYAI_API_KEY
    })
  }

  // 使用单例模式
  static getInstance(onTranscript: (text: string, fileId?: string) => void): SpeechRecognition {
    if (!SpeechRecognition.instance) {
      SpeechRecognition.instance = new SpeechRecognition(onTranscript)
    }
    SpeechRecognition.instance.onTranscript = onTranscript
    return SpeechRecognition.instance
  }

  // 开始录音
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // 使用标准的音频格式配置
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      this.audioChunks = []
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start()
      console.log('开始录音')
      
    } catch (error) {
      console.error('开始录音失败:', error)
      throw error
    }
  }

  // 停止录音
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        this.audioChunks = []
        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
      console.log('停止录音')
    })
  }

  // 上传音频文件
  async uploadAudio(file: File, fileId?: string): Promise<void> {
    try {
      // 检查API Key
      if (!ASSEMBLYAI_API_KEY) {
        throw new Error('AssemblyAI API Key is not configured')
      }

      // 检查文件格式
      if (!isFormatSupported(file.name)) {
        throw new Error(`不支持的文件格式: ${file.name}`);
      }

      // 检查文件大小
      const maxSize = getConfig().assemblyai.maxFileSize;
      if (file.size > maxSize) {
        throw new Error(`文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大允许${(maxSize / 1024 / 1024).toFixed(2)}MB`);
      }

      // 获取文件类型
      const fileType = getFileType(file.name);
      if (!fileType) {
        throw new Error(`无法识别文件类型: ${file.name}`);
      }

      console.log('开始上传音频文件:', file.type)
      
      try {
        // 1. 上传文件获取URL
        const uploadUrl = await this.client.files.upload(file)
        console.log('文件上传成功:', uploadUrl)

        // 等待一段时间，确保文件已被 AssemblyAI 处理
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 2. 创建转写任务
        const transcriptParams: TranscriptParams = {
          audio_url: uploadUrl,
          ...speechRecognitionConfig
        }
        const transcript = await this.client.transcripts.create(transcriptParams)
        console.log('转写任务创建成功:', transcript.id)

        // 等待一段时间，确保转写任务已开始
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 3. 获取转写结果
        let result = await this.client.transcripts.get(transcript.id)
        let retryCount = 0
        const maxRetries = 10
        
        // 4. 等待转写完成
        while (result.status !== 'completed' && result.status !== 'error') {
          if (retryCount >= maxRetries) {
            throw new Error('转写超时')
          }

          await new Promise(resolve => setTimeout(resolve, 3000))
          
          try {
            result = await this.client.transcripts.get(transcript.id)
            console.log('转写状态:', result.status, '重试次数:', retryCount)
            retryCount++
          } catch (error) {
            console.error('获取转写状态失败:', error)
            retryCount++
            continue
          }
        }

        if (result.status === 'completed' && result.text) {
          console.log('转写完成')
          // 如果有 fileId，将其传递给回调函数
          if (fileId) {
            this.onTranscript(result.text, fileId)
          } else {
            this.onTranscript(result.text)
          }
        } else if (result.status === 'error') {
          throw new Error('转写失败: ' + result.error)
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            throw new Error('AssemblyAI API Key 无效或已过期')
          } else if (error.message.includes('429')) {
            throw new Error('API 调用次数超过限制')
          }
        }
        throw error
      }
    } catch (error) {
      console.error('上传音频文件失败:', error)
      throw error
    }
  }

  // 处理录音数据
  async handleRecordedAudio(audioBlob: Blob) {
    try {
      console.log('开始处理录音数据:', audioBlob.type)
      
      // 将 Blob 转换为 File，使用正确的文件扩展名和MIME类型
      const file = new File([audioBlob], `录音_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`, { 
        type: 'audio/webm'
      })
      
      // 使用相同的上传处理流程
      await this.uploadAudio(file)
      
    } catch (error) {
      console.error('处理录音数据失败:', error)
      throw error
    }
  }
} 