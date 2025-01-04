import { getConfig } from './config'

interface AliyunConfig {
  accessKeyId: string
  accessKeySecret: string
  appKey: string
}

export class AliyunASR {
  private ws: WebSocket | null = null
  private taskId: string | null = null
  private isConnected: boolean = false
  private connectPromise: Promise<void> | null = null
  private config: AliyunConfig

  constructor(
    private onMessage: (text: string) => void,
    private onError: (error: any) => void
  ) {
    // 在构造函数中获取配置
    this.config = getConfig().aliyun
  }

  // 生成唯一ID
  private generateUUID(): string {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  // 获取 Token
  private async getToken(): Promise<string> {
    try {
      console.log('正在获取 Token...')
      const response = await fetch('/api/aliyun/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const responseText = await response.text()
      console.log('Token API 响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText
      })

      if (!response.ok) {
        let errorMessage = `Token 请求失败: ${response.status} ${response.statusText}`
        try {
          const errorData = JSON.parse(responseText)
          if (errorData.error) {
            errorMessage += `\n${errorData.error}`
          }
        } catch (e) {
          errorMessage += `\n${responseText}`
        }
        throw new Error(errorMessage)
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        throw new Error(`响应不是有效的 JSON: ${responseText}`)
      }

      if (!data.token) {
        throw new Error(`响应格式错误: ${JSON.stringify(data)}`)
      }

      console.log('Token 获取成功')
      return data.token
    } catch (error) {
      console.error('获取 Token 失败:', error)
      throw error instanceof Error ? error : new Error(String(error))
    }
  }

  // 获取 WebSocket URL
  private async getWebSocketUrl(): Promise<string> {
    const token = await this.getToken()
    const url = new URL('wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1')
    url.searchParams.append('token', token)
    url.searchParams.append('appkey', this.config.appKey)
    return url.toString()
  }

  // 等待 WebSocket 连接建立
  private waitForConnection(): Promise<void> {
    if (this.isConnected) {
      return Promise.resolve()
    }
    if (this.connectPromise) {
      return this.connectPromise
    }
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket 未初始化'))
        return
      }
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket 连接超时'))
      }, 10000)

      const handleOpen = () => {
        clearTimeout(timeout)
        this.isConnected = true
        resolve()
      }

      const handleError = (error: Event) => {
        clearTimeout(timeout)
        reject(error)
      }

      this.ws.addEventListener('open', handleOpen, { once: true })
      this.ws.addEventListener('error', handleError, { once: true })
    })
  }

  // 开始识别
  async startRecognition() {
    try {
      const url = await this.getWebSocketUrl()
      this.ws = new WebSocket(url)
      this.connectPromise = this.waitForConnection()
      
      // 等待连接建立
      await this.connectPromise

      console.log('WebSocket 连接已建立')
      const taskId = this.generateUUID()
      this.taskId = taskId
      
      // 发送开始识别的指令
      const startParams = {
        header: {
          message_id: this.generateUUID(),
          task_id: taskId,
          namespace: 'SpeechTranscriber',
          name: 'StartTranscription',
          appkey: this.config.appKey
        },
        payload: {
          format: 'pcm',
          sample_rate: 16000,
          enable_intermediate_result: true,
          enable_punctuation_prediction: true,
          enable_inverse_text_normalization: true
        }
      }

      console.log('发送开始识别指令:', startParams)
      this.ws.send(JSON.stringify(startParams))

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('收到消息:', message)

          if (message.header.name === 'TranscriptionResultChanged') {
            // 实时识别结果
            this.onMessage(message.payload.result)
          } else if (message.header.name === 'TranscriptionCompleted') {
            // 识别完成
            this.onMessage(message.payload.result || '')
            this.taskId = null
          } else if (message.header.name === 'TaskFailed') {
            // 识别失败
            console.error('识别失败:', message.header.status_text)
            this.onError(new Error(message.header.status_text))
          }
        } catch (error) {
          console.error('处理消息失败:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        this.isConnected = false
        this.onError(error)
      }

      this.ws.onclose = () => {
        console.log('WebSocket 连接已关闭')
        this.isConnected = false
        this.taskId = null
      }
    } catch (error) {
      console.error('启动识别失败:', error)
      this.onError(error)
      throw error
    }
  }

  // 发送音频数据
  async sendAudioData(data: Blob) {
    if (!this.ws) {
      throw new Error('WebSocket 未初始化')
    }

    if (!this.isConnected) {
      throw new Error('WebSocket 未连接')
    }

    if (!this.taskId) {
      throw new Error('识别任务未启动')
    }

    try {
      // 将 Blob 转换为二进制数据
      const buffer = await data.arrayBuffer()
      this.ws.send(buffer)
    } catch (error) {
      console.error('发送音频数据失败:', error)
      throw error
    }
  }

  // 停止识别
  stopRecognition() {
    if (this.ws && this.taskId) {
      try {
        // 发送停止识别的指令
        const stopParams = {
          header: {
            message_id: this.generateUUID(),
            task_id: this.taskId,
            namespace: 'SpeechTranscriber',
            name: 'StopTranscription',
            appkey: this.config.appKey
          }
        }
        
        console.log('发送停止识别指令:', stopParams)
        this.ws.send(JSON.stringify(stopParams))
      } catch (error) {
        console.error('发送停止指令失败:', error)
      }
    }
    
    // 关闭连接
    if (this.ws) {
      try {
        this.ws.close()
      } catch (error) {
        console.error('关闭 WebSocket 连接失败:', error)
      } finally {
        this.ws = null
        this.isConnected = false
        this.connectPromise = null
      }
    }
  }
} 