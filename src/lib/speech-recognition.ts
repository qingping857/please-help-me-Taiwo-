import { AssemblyAI } from 'assemblyai'
import { ASSEMBLYAI_API_KEY, speechRecognitionConfig } from './assemblyai'
import { isFormatSupported } from './config'

export class SpeechRecognition {
  private onTranscript: (text: string) => void
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private client: AssemblyAI

  constructor(onTranscript: (text: string) => void) {
    this.onTranscript = onTranscript
    this.client = new AssemblyAI({
      apiKey: ASSEMBLYAI_API_KEY
    })
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
  async uploadAudio(audioFile: File) {
    try {
      console.log('开始上传音频文件:', audioFile.type)
      
      // 验证文件格式
      if (!isFormatSupported(audioFile.name)) {
        throw new Error('不支持的文件格式')
      }

      // 1. 上传文件获取URL
      const uploadUrl = await this.client.files.upload(audioFile)
      console.log('文件上传成功:', uploadUrl)

      // 2. 创建转写任务
      const transcript = await this.client.transcripts.create({
        audio_url: uploadUrl,
        ...speechRecognitionConfig
      })
      console.log('转写任务创建成功:', transcript.id)

      // 3. 获取转写结果
      let result = await this.client.transcripts.get(transcript.id)
      
      // 4. 等待转写完成
      while (result.status !== 'completed' && result.status !== 'error') {
        await new Promise(resolve => setTimeout(resolve, 3000))
        result = await this.client.transcripts.get(transcript.id)
        console.log('转写状态:', result.status)
      }

      if (result.status === 'completed' && result.text) {
        console.log('转写完成')
        this.onTranscript(result.text)
      } else if (result.status === 'error') {
        throw new Error('转写失败: ' + result.error)
      }

    } catch (error) {
      console.error('处理音频文件失败:', error)
      throw error
    }
  }

  // 处理录音数据
  async handleRecordedAudio(audioBlob: Blob) {
    try {
      console.log('开始处理录音数据:', audioBlob.type)
      
      // 将 Blob 转换为 File，使用正确的文件扩展名和MIME类型
      const file = new File([audioBlob], 'recording.webm', { 
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