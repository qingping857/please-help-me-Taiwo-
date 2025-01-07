import { type SpeechModel } from 'assemblyai'

// AssemblyAI API 配置
export const ASSEMBLYAI_API_KEY = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || ''

// Speech Recognition API 配置
export const speechRecognitionConfig = {
  speech_model: 'nano' as const, // 使用 nano 模型以支持更多语言
  punctuate: true, // 添加标点符号
  format_text: true, // 格式化文本（包括专有名词和数字）
  language_code: 'ar', // 指定阿拉伯语
  disfluencies: false // 移除语气词（um, uh, hmm等）
};