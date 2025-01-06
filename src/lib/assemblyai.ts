import { type SpeechModel } from 'assemblyai'

// AssemblyAI API 配置
export const ASSEMBLYAI_API_KEY = '19c61fc2f79648f5ae6b3ccfb42f8ba4'

// Speech Recognition API 配置
export const speechRecognitionConfig = {
  speech_model: 'best' as const, // 使用最佳模型
  punctuate: true, // 添加标点符号
  format_text: true, // 格式化文本（包括专有名词和数字）
  language_detection: true, // 启用自动语言检测
  language_code: null, // 不指定固定语言，使用自动检测
  disfluencies: false, // 移除语气词（um, uh, hmm等）
  filter_profanity: true // 过滤脏话
};