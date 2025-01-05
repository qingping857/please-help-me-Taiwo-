import { NextRequest } from 'next/server'
import { ReadStream } from 'fs'

const DEER_API_URL = 'https://api.deerapi.com/v1/audio/transcriptions'

// 重试配置
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2秒
const REQUEST_TIMEOUT = 300000 // 5分钟

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function retryFetch(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`API请求失败: ${response.status} ${response.statusText}\n${text}`)
    }
    return response
  } catch (error) {
    if (retries > 0) {
      console.log(`请求失败，${retries}秒后重试...`, error)
      await sleep(RETRY_DELAY)
      return retryFetch(url, options, retries - 1)
    }
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    console.log('准备发送请求到 DeerAPI...')
    
    // 从请求中获取文件
    const file = formData.get('file')
    if (!file || !(file instanceof Blob)) {
      throw new Error('未找到音频文件')
    }

    // 检查文件大小
    const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('文件大小超过25MB限制')
    }

    // 创建新的 FormData，按照 OpenAI 官方文档的格式
    const apiFormData = new FormData()
    
    // 文件必须作为第一个字段
    apiFormData.append('file', file)
    
    // 必需的字段
    apiFormData.append('model', 'whisper-1')
    
    // 可选字段
    const language = formData.get('language')
    if (language) {
      apiFormData.append('language', language as string)
    }
    
    const prompt = formData.get('prompt')
    if (prompt) {
      apiFormData.append('prompt', prompt as string)
    }
    
    const responseFormat = formData.get('response_format')
    if (responseFormat) {
      apiFormData.append('response_format', responseFormat as string)
    }
    
    const temperature = formData.get('temperature')
    if (temperature) {
      apiFormData.append('temperature', temperature as string)
    }

    // 设置超时
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      console.log('发送请求到:', DEER_API_URL)
      console.log('请求参数:', {
        model: 'whisper-1',
        language: language || 'zh',
        response_format: responseFormat || 'verbose_json',
        file_size: file.size,
        file_type: file.type
      })
      
      const response = await retryFetch(DEER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEER_API_KEY}`,
          'Accept': 'application/json',
        },
        body: apiFormData,
        signal: controller.signal,
      })

      const data = await response.json()
      console.log('收到 DeerAPI 响应:', data)

      return Response.json(data)
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    console.error('处理请求时出错:', error)
    
    return Response.json(
      {
        error: error instanceof Error ? error.message : '处理请求失败',
        details: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause
        } : undefined
      },
      { status: 500 }
    )
  }
} 