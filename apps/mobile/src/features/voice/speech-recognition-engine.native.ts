import { Platform } from 'react-native'
import type { TargetLanguage } from '../learning/learning-profile'
import { describeNativeError, nativeFilePath } from './native-file-path'

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
    let context: WhisperContext
    try {
      context = await initWhisper({
        filePath: nativeFilePath(modelUri),
        useGpu: Platform.OS === 'ios',
        useFlashAttn: Platform.OS === 'ios',
      })
    } catch (error) {
      throw new Error(`Não foi possível carregar o reconhecimento de voz: ${describeNativeError(error)}`)
    }
    if (loadVersion !== this.loadVersion) {
      await context.release()
      throw new Error('Carregamento do reconhecimento de voz cancelado.')
    }
    this.context = context
    this.loadedModelUri = modelUri
  }

  async transcribe(audioUri: string, language: TargetLanguage) {
    if (!this.context) throw new Error('O modelo de reconhecimento de voz não foi carregado.')

    try {
      const { promise, stop } = this.context.transcribe(nativeFilePath(audioUri), {
        language,
        translate: false,
        maxThreads: 4,
        temperature: 0,
        beamSize: 5,
      })
      this.stopCurrentTranscription = stop
      const { result, isAborted } = await promise
      if (isAborted) throw new Error('Transcrição interrompida')
      return cleanTranscript(result)
    } catch (error) {
      throw new Error(`Não foi possível transcrever o áudio: ${describeNativeError(error)}`)
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
