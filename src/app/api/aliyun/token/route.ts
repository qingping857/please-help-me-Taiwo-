import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerConfig } from '@/lib/config'

// 从 XML 中提取 Token ID
function extractTokenFromXml(xml: string): string {
  console.log('开始解析 XML 响应...')
  console.log('原始 XML:', xml)
  
  // 清理 XML（移除空白字符）
  const cleanXml = xml.trim()
  console.log('清理后的 XML:', cleanXml)

  // 首先检查是否是错误响应
  if (cleanXml.includes('<Error>')) {
    console.log('检测到错误响应')
    const codeMatch = cleanXml.match(/<Code>([^<]+)<\/Code>/)
    const messageMatch = cleanXml.match(/<Message>([^<]+)<\/Message>/)
    const errorMessage = `阿里云错误: ${codeMatch?.[1] || '未知错误'} - ${messageMatch?.[1] || '未知错误描述'}`
    console.error('错误详情:', errorMessage)
    throw new Error(errorMessage)
  }

  // 检查是否有错误消息
  if (cleanXml.includes('<ErrMsg>')) {
    const errMsgMatch = cleanXml.match(/<ErrMsg>([^<]*)<\/ErrMsg>/)
    const errMsg = errMsgMatch?.[1]
    if (errMsg) {
      console.error('发现错误消息:', errMsg)
      throw new Error(`阿里云错误: ${errMsg}`)
    }
  }

  // 检查是否是 Token 响应
  if (!cleanXml.includes('<CreateTokenResponse>')) {
    console.log('响应不是预期的 CreateTokenResponse 格式')
    throw new Error(`未知的响应格式: ${cleanXml}`)
  }

  console.log('开始查找 Token ID...')
  const tokenIdMatch = cleanXml.match(/<Id>([^<]+)<\/Id>/)
  if (!tokenIdMatch) {
    console.error('未找到 Token ID')
    throw new Error(`响应中未找到 Token ID: ${cleanXml}`)
  }

  const tokenId = tokenIdMatch[1]
  console.log('成功提取 Token ID:', tokenId)
  return tokenId
}

// 生成 Token
async function createToken(accessKeyId: string, accessKeySecret: string): Promise<string> {
  // 使用 HTTPS
  const apiUrl = 'https://nls-meta.cn-shanghai.aliyuncs.com/pop/2018-05-18/tokens'
  
  const date = new Date().toUTCString()
  const requestBody = ''  // 使用空字符串作为请求体
  const contentMD5 = crypto
    .createHash('md5')
    .update(requestBody)
    .digest('base64')
  const accept = 'application/json'  // 修改为 application/json
  const contentType = 'application/json'
  
  // 按照阿里云要求的格式构建签名字符串
  const stringToSign = [
    'POST',
    accept,
    contentMD5,
    contentType,
    date,
    '/pop/2018-05-18/tokens'
  ].join('\n')
  
  console.log('构建签名字符串:', stringToSign)
  
  const signature = crypto
    .createHmac('sha1', accessKeySecret)
    .update(stringToSign)
    .digest('base64')

  console.log('生成签名:', signature)

  const headers = {
    'Accept': accept,
    'Content-Type': contentType,
    'Content-MD5': contentMD5,
    'Date': date,
    'Authorization': `Dataplus ${accessKeyId}:${signature}`,
    'Host': 'nls-meta.cn-shanghai.aliyuncs.com',
    'Content-Length': '0'  // 设置为 0，因为请求体为空
  }

  try {
    console.log('准备发送请求...')
    console.log('请求 URL:', apiUrl)
    console.log('请求头:', {
      ...headers,
      'Authorization': '(hidden)'
    })

    console.log('发送请求...')
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: requestBody
    })

    console.log('收到响应...')
    console.log('响应状态:', response.status, response.statusText)
    console.log('响应头:', Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log('响应体:', responseText)

    if (!response.ok) {
      console.error('响应状态错误')
      throw new Error(`阿里云响应错误: ${response.status} ${response.statusText}\n${responseText}`)
    }

    // 从 XML 中提取 Token
    console.log('开始提取 Token...')
    const tokenId = extractTokenFromXml(responseText)
    console.log('Token 提取成功:', tokenId)
    return tokenId
  } catch (error) {
    console.error('请求过程中发生错误:', error)
    throw error
  }
}

export async function POST() {
  try {
    console.log('开始处理 Token 请求...')
    // 获取服务器端配置
    const config = getServerConfig()
    
    // 验证配置
    if (!config.aliyun.accessKeyId || !config.aliyun.accessKeySecret) {
      console.error('缺少阿里云配置:', {
        accessKeyId: !!config.aliyun.accessKeyId,
        accessKeySecret: !!config.aliyun.accessKeySecret
      })
      return NextResponse.json(
        { error: '请先在配置文件中设置阿里云的 AccessKey ID 和 AccessKey Secret' },
        { status: 500 }
      )
    }

    console.log('配置验证通过，使用配置:', {
      accessKeyId: config.aliyun.accessKeyId.slice(0, 4) + '****',
      accessKeySecret: '****'
    })

    // 获取 Token
    console.log('开始获取 Token...')
    const token = await createToken(
      config.aliyun.accessKeyId,
      config.aliyun.accessKeySecret
    )

    console.log('Token 获取成功，返回结果')
    return NextResponse.json({ 
      token,
      wsUrl: 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1'  // 返回 WebSocket 连接地址
    })
  } catch (error) {
    console.error('Token API 错误:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取 Token 失败' },
      { status: 500 }
    )
  }
} 