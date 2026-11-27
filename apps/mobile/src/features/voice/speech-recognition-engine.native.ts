import { Platform } from 'react-native'
import type { TargetLanguage } from '../learning/learning-profile'

type WhisperModule = typeof import('whisper.rn/index')
type WhisperContext = Awaited<ReturnType<WhisperModule['initWhisper']>>

export class LocalSpeechRecognitionEngine {
  private context: WhisperContext | null = null
  private loadedModelUri: string | null = null
  private stopCurrentTranscription: (() => Promise<void>) | null = null
  private loadVersion = 0

  async load(modelUri: string) {
    if (this.context && this.loadedModelUri === modelUri) return
    await this.dispose()

    const loadVersion = ++this.loadVersion
    const { initWhisper } = await import('whisper.rn/index')
    const context = await initWhisper({
      filePath: modelUri,
      useGpu: Platform.OS === 'ios',
      useFlashAttn: Platform.OS === 'ios',
    })
    if (loadVersion !== this.loadVersion) {
      await context.release()
      throw new Error('Carregamento do reconhecimento de voz cancelado.')
    }
    this.context = context
    this.loadedModelUri = modelUri
  }

  async transcribe(audioUri: string, language: TargetLanguage) {
    if (!this.context) throw new Error('O modelo de reconhecimento de voz não foi carregado.')

    const { promise, stop } = this.context.transcribe(audioUri, {
      language,
      translate: false,
      maxThreads: 4,
      temperature: 0,
      beamSize: 5,
    })
    this.stopCurrentTranscription = stop
    try {
      const { result } = await promise
      return cleanTranscript(result)
    } finally {
      this.stopCurrentTranscription = null
    }
  }

  async cancel() {
    await this.stopCurrentTranscription?.()
    this.stopCurrentTranscription = null
  }

  async dispose() {
    this.loadVersion += 1
    const context = this.context
    this.context = null
    this.loadedModelUri = null
    try {
      await this.cancel()
    } finally {
      await context?.release()
    }
  }
}

function cleanTranscript(value: string) {
  return value
    .replace(/\[(?:BLANK_AUDIO|MUSIC|SILENCE|NOISE)\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}
