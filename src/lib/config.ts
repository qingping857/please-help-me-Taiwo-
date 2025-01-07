export const SUPPORTED_AUDIO_FORMATS = [
  '3ga', '8svx', 'aac', 'ac3', 'aif', 'aiff', 'alac', 'amr',
  'ape', 'au', 'dss', 'flac', 'flv', 'm4a', 'm4b', 'm4p',
  'm4r', 'mp3', 'mpga', 'ogg', 'oga', 'mogg', 'opus', 'qcp',
  'tta', 'voc', 'wav', 'wma', 'wv'
] as const;

export const SUPPORTED_VIDEO_FORMATS = [
  'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'
] as const;

export type SupportedAudioFormat = typeof SUPPORTED_AUDIO_FORMATS[number];
export type SupportedVideoFormat = typeof SUPPORTED_VIDEO_FORMATS[number];

interface Config {
  assemblyai: {
    apiKey: string;
    baseUrl: string;
    maxFileSize: number; // 以字节为单位
    supportedFormats: {
      audio: typeof SUPPORTED_AUDIO_FORMATS;
      video: typeof SUPPORTED_VIDEO_FORMATS;
    };
  };
}

// 直接初始化配置
const config: Config = {
  assemblyai: {
    apiKey: process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || '',
    baseUrl: 'https://api.assemblyai.com/v2',
    maxFileSize: 1024 * 1024 * 1000, // 1GB
    supportedFormats: {
      audio: SUPPORTED_AUDIO_FORMATS,
      video: SUPPORTED_VIDEO_FORMATS
    }
  }
};

export function getConfig(): Config {
  return config;
}

// 检查文件格式是否支持
export function isFormatSupported(filename: string | undefined): boolean {
  if (!filename) return false;
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return [...SUPPORTED_AUDIO_FORMATS, ...SUPPORTED_VIDEO_FORMATS].includes(extension as any);
}

// 获取文件格式类型（音频或视频）
export function getFileType(filename: string | undefined): 'audio' | 'video' | null {
  if (!filename) return null;
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  if (SUPPORTED_AUDIO_FORMATS.includes(extension as any)) {
    return 'audio';
  }
  if (SUPPORTED_VIDEO_FORMATS.includes(extension as any)) {
    return 'video';
  }
  return null;
} 