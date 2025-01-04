const DEER_API_URL = 'https://api.deerapi.com/openai/audio/transcriptions'

export async function transcribeAudio(audioFile: File) {
  try {
    console.log('准备转录音频文件:', audioFile.name, audioFile.type, audioFile.size)
    
    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', 'whisper-1')
    formData.append('language', 'zh')
    formData.append('response_format', 'json')

    console.log('发送转录请求...')
    const response = await fetch('/api/whisper', {
      method: 'POST',
      body: formData,
    })

    console.log('收到响应:', response.status)
    const responseText = await response.text()
    console.log('响应内容:', responseText)

    if (!response.ok) {
      throw new Error(`转录请求失败: ${response.status} ${response.statusText}\n${responseText}`)
    }

    // 解析 JSON 响应
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('解析响应失败:', e)
      throw new Error(`无法解析响应: ${responseText}`)
    }

    if (!data.text) {
      throw new Error(`响应中没有文本内容: ${JSON.stringify(data)}`)
    }

    return data.text
  } catch (error) {
    console.error('音频转录失败:', error)
    throw error
  }
} 