import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: 'sk-JHQ9r39rw9wfNbKryDxsSwgP0rgd5iKVziyU18PApcYERXAT',
  baseURL: 'https://api.deerapi.com/v1',
  dangerouslyAllowBrowser: true
})

export interface TranscriptionOptions {
  language?: string
  prompt?: string
}

export async function transcribeAudio(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
) {
  console.log('开始转录音频...')
  console.log('音频大小:', Math.round(audioBlob.size / 1024), 'KB')
  console.log('选择的语言:', options.language || '自动检测')

  try {
    // 将 Blob 转换为 File 对象
    const audioFile = new File([audioBlob], 'audio.wav', {
      type: 'audio/wav'
    })
    console.log('音频文件已创建')

    console.log('正在调用 OpenAI API...')
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: options.language,
      prompt: options.prompt,
      response_format: 'verbose_json'
    })
    console.log('API 调用成功')
    console.log('转录结果:', response)

    return response
  } catch (error: any) {
    console.error('转录失败:', error)
    console.error('错误详情:', {
      message: error?.message || '未知错误',
      status: error?.status || '未知状态',
      response: error?.response || '无响应详情'
    })
    throw error
  }
} 