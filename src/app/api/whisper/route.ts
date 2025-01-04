import { NextRequest } from 'next/server'

const DEER_API_URL = 'https://api.deerapi.com/v1/audio/transcriptions'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    console.log('准备发送请求到 DeerAPI...')
    console.log('API Key:', process.env.DEER_API_KEY?.slice(0, 10) + '...')
    
    // 创建新的 FormData 对象
    const apiFormData = new FormData()
    
    // 从请求中获取文件并添加到新的 FormData
    const file = formData.get('file')
    if (!file) {
      throw new Error('未找到音频文件')
    }
    apiFormData.append('file', file)
    
    // 添加必需的参数
    apiFormData.append('model', 'whisper-1')
    apiFormData.append('response_format', 'json')
    
    // 转发请求到 DeerAPI
    const response = await fetch(DEER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEER_API_KEY}`,
        'Accept': 'application/json',
      },
      body: apiFormData,
    })

    console.log('DeerAPI 响应状态:', response.status)
    const responseText = await response.text()
    console.log('DeerAPI 响应内容:', responseText)

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}\n${responseText}`)
    }

    // 解析响应
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('解析响应失败:', e)
      throw new Error(`无法解析响应: ${responseText}`)
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('处理请求时出错:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '处理请求失败',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
} 