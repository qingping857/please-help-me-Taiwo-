import CryptoJS from 'crypto-js'

// 配置参数
const APPID = '896948f2'
const API_SECRET = 'ZTRiODlmNGQ1MGM1MmI4ZGVkMGYzNTMx'
const API_KEY = 'ba94f8551bd446d8e5faeae7f49ad2505'

// 每帧音频大小
const FRAME_SIZE = 1280

interface XunfeiConfig {
  appId: string
  apiSecret: string
  apiKey: string
}

// 生成鉴权参数
function getAuthUrl(): string {
  const url = 'wss://iat-api.xfyun.cn/v2/iat'
  const host = 'iat-api.xfyun.cn'
  const date = new Date().toUTCString()
  const algorithm = 'hmac-sha256'
  const headers = 'host date request-line'
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`
  const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, API_SECRET)
  const signature = CryptoJS.enc.Base64.stringify(signatureSha)
  const authorizationOrigin = `api_key="${API_KEY}",algorithm="${algorithm}",headers="${headers}",signature="${signature}"`
  const authorization = btoa(authorizationOrigin)
  return `${url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`
}

// 创建业务参数
function getBusinessParams(status = 0) {
  return {
    common: {
      app_id: APPID,
    },
    business: {
      language: 'zh_cn',
      domain: 'iat',
      accent: 'mandarin',
      dwa: 'wpgs',  // 开启动态修正
      vad_eos: 10000, // 音频后端点检测时间，单位是毫秒
      ptt: 0,      // 标点符号添加：添加
    },
    data: {
      status,      // 音频的状态，0：第一帧音频， 1：中间帧音频，2：最后一帧音频
      format: 'audio/L16;rate=16000',
      encoding: 'raw',
      audio: '',   // 音频数据
    },
  }
}

export class XunfeiASR {
  private ws: WebSocket | null = null
  private frameBuffer: Uint8Array[] = []
  private isProcessing = false
  private isFirstFrame = true

  constructor(
    private onResult: (text: string, isEnd: boolean) => void,
    private onError: (error: Error) => void
  ) {}

  // 连接 WebSocket
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = getAuthUrl()
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('WebSocket 连接已建立')
          resolve()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error)
          this.onError(new Error('WebSocket 连接错误'))
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket 连接已关闭')
        }

        this.ws.onmessage = (event) => {
          try {
            const result = JSON.parse(event.data)
            if (result.code !== 0) {
              this.onError(new Error(`错误码：${result.code}，错误信息：${result.message}`))
              return
            }

            const str = result.data.result.string
            const pgs = result.data.result.pgs
            const isEnd = result.data.status === 2
            
            if (str && str.length > 0) {
              this.onResult(str, pgs === 'apd')
            }

            if (isEnd) {
              this.close()
            }
          } catch (error) {
            console.error('处理消息时出错:', error)
          }
        }
      } catch (error) {
        console.error('建立连接时出错:', error)
        reject(error)
      }
    })
  }

  // 发送音频数据
  async sendAudioData(audioData: Blob): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket 未连接')
    }

    try {
      // 检查音频格式
      const supportedFormats = ['audio/wav', 'audio/mp3', 'audio/webm', 'audio/pcm']
      if (!supportedFormats.includes(audioData.type)) {
        throw new Error('不支持的音频格式，仅支持 PCM、MP3、WAV 格式')
      }

      // 将音频转换为 PCM 格式
      const audioContext = new AudioContext({
        sampleRate: 16000, // 设置采样率为 16kHz
      })
      
      const arrayBuffer = await audioData.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // 检查音频时长
      if (audioBuffer.duration > 60) {
        throw new Error('音频时长不能超过60秒')
      }
      
      // 转换为单声道 16bit PCM
      const pcmData = new Float32Array(audioBuffer.length)
      audioBuffer.copyFromChannel(pcmData, 0) // 只取第一个声道

      // 转换为 16bit PCM
      const pcm16bit = new Int16Array(pcmData.length)
      for (let i = 0; i < pcmData.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]))
        pcm16bit[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      // 按帧大小分割音频
      const uint8Array = new Uint8Array(pcm16bit.buffer)
      for (let i = 0; i < uint8Array.length; i += FRAME_SIZE) {
        const frame = uint8Array.slice(i, i + FRAME_SIZE)
        this.frameBuffer.push(frame)
      }

      // 如果没有正在处理，开始处理
      if (!this.isProcessing) {
        this.processFrames()
      }
    } catch (error) {
      console.error('发送音频数据时出错:', error)
      throw error
    }
  }

  // 处理音频帧
  private async processFrames(): Promise<void> {
    if (this.frameBuffer.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const frame = this.frameBuffer.shift()!

    try {
      // 将音频数据转换为 Base64
      const audioBase64 = btoa(String.fromCharCode(...frame))
      
      // 检查 base64 编码后的大小
      if (audioBase64.length > 13000) {
        console.warn('音频帧大小超过限制，将被截断')
      }
      
      let status = 1
      if (this.isFirstFrame) {
        status = 0
        this.isFirstFrame = false
      } else if (this.frameBuffer.length === 0) {
        status = 2
      }
      
      const params = getBusinessParams(status)
      params.data.audio = audioBase64

      this.ws?.send(JSON.stringify(params))

      // 处理下一帧，确保不超过音频长度限制（60s）
      if (this.frameBuffer.length > 0) {
        setTimeout(() => this.processFrames(), 40)
      }
    } catch (error) {
      console.error('处理音频帧时出错:', error)
      this.onError(error instanceof Error ? error : new Error('处理音频帧失败'))
    }
  }

  // 关闭连接
  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.frameBuffer = []
    this.isProcessing = false
    this.isFirstFrame = true
  }
} 