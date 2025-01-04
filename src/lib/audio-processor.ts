export class AudioProcessor {
  private context: AudioContext
  private processor: ScriptProcessorNode
  private input: MediaStreamAudioSourceNode | null = null

  constructor(
    private onAudioData: (data: Float32Array) => void,
    private sampleRate: number = 16000
  ) {
    this.context = new AudioContext()
    // 创建一个 ScriptProcessorNode，缓冲区大小设为 4096
    this.processor = this.context.createScriptProcessor(4096, 1, 1)
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)
      // 重采样到 16kHz
      const resampledData = this.resample(inputData)
      this.onAudioData(resampledData)
    }
  }

  // 开始处理音频流
  async start(stream: MediaStream) {
    this.input = this.context.createMediaStreamSource(stream)
    this.input.connect(this.processor)
    this.processor.connect(this.context.destination)
  }

  // 停止处理
  stop() {
    if (this.processor) {
      this.processor.disconnect()
      if (this.input) {
        this.input.disconnect()
        this.input = null
      }
    }
  }

  // 重采样函数
  private resample(audioData: Float32Array): Float32Array {
    const inputSampleRate = this.context.sampleRate
    if (inputSampleRate === this.sampleRate) {
      return audioData
    }

    const ratio = inputSampleRate / this.sampleRate
    const newLength = Math.round(audioData.length / ratio)
    const result = new Float32Array(newLength)

    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio
      const index = Math.floor(pos)
      const fraction = pos - index
      
      if (index + 1 < audioData.length) {
        result[i] = audioData[index] * (1 - fraction) + audioData[index + 1] * fraction
      } else {
        result[i] = audioData[index]
      }
    }

    return result
  }

  // 将 Float32Array 转换为 PCM 16bit
  static float32ToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return pcm16
  }

  // 将 Int16Array 转换为 Blob
  static pcm16ToBlob(pcm16: Int16Array): Blob {
    const buffer = new ArrayBuffer(pcm16.length * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < pcm16.length; i++) {
      view.setInt16(i * 2, pcm16[i], true) // 小端序
    }
    return new Blob([buffer], { type: 'audio/pcm' })
  }
}