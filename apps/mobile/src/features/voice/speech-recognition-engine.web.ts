import type { TargetLanguage } from '../learning/learning-profile'

export class LocalSpeechRecognitionEngine {
  async load(_modelUri: string) {
    throw new Error('O reconhecimento de voz local está disponível apenas no aplicativo instalado.')
  }

  async transcribe(_audioUri: string, _language: TargetLanguage) {
    return ''
  }

  async cancel() {}
  async dispose() {}
}
