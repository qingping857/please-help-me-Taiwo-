import { AssemblyAI } from 'assemblyai'
import { ASSEMBLYAI_API_KEY } from '@/lib/assemblyai'

export async function POST() {
  try {
    console.log('开始获取临时 token')
    const client = new AssemblyAI({
      apiKey: ASSEMBLYAI_API_KEY
    })

    const { token } = await client.realtime.createTemporaryToken({
      expires_in: 3600  // token 有效期 1 小时
    })

    console.log('获取临时 token 成功')
    return Response.json({ token })
  } catch (error) {
    console.error('获取临时 token 失败:', error)
    return Response.json({ error: error instanceof Error ? error.message : '获取临时 token 失败' }, { status: 500 })
  }
} 