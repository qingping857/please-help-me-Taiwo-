interface Config {
  aliyun: {
    accessKeyId: string
    accessKeySecret: string
    appKey: string
  }
}

let config: Config | null = null

export async function initConfig(): Promise<void> {
  try {
    // 获取公开配置
    const publicConfigResponse = await fetch('/api/aliyun/config')
    const publicConfig = await publicConfigResponse.json()

    config = {
      aliyun: {
        accessKeyId: '',  // 这些值只在服务器端使用
        accessKeySecret: '', // 这些值只在服务器端使用
        appKey: publicConfig.appKey
      }
    }
  } catch (error) {
    console.error('获取配置失败:', error)
    throw new Error('获取配置失败')
  }
}

export function getConfig(): Config {
  if (!config) {
    throw new Error('配置未初始化，请先调用 initConfig()')
  }
  return config
}

// 服务器端直接使用环境变量
export function getServerConfig(): Config {
  return {
    aliyun: {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
      appKey: process.env.NEXT_PUBLIC_ALIYUN_APP_KEY || ''
    }
  }
} 