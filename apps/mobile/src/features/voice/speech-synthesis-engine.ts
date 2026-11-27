import * as Speech from 'expo-speech'
import type { TargetLanguage } from '../learning/learning-profile'

const speechLocales: Record<TargetLanguage, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
}

export async function speakTutorText(text: string, language: TargetLanguage) {
  const content = text.trim()
  if (!content) return

  await Speech.stop()
  const locale = speechLocales[language]
  const voice = await findVoice(locale)

  await new Promise<void>((resolve, reject) => {
    let settled = false
    let watchdog: ReturnType<typeof setTimeout> | undefined
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      if (watchdog) clearTimeout(watchdog)
      if (error) reject(error)
      else resolve()
    }

    watchdog = setTimeout(() => {
      void Speech.stop()
      finish(new Error('A síntese de voz não respondeu.'))
    }, 45_000)

    Speech.speak(content, {
      language: locale,
      voice,
      rate: 0.88,
      pitch: 1,
      onDone: () => finish(),
      onStopped: () => finish(),
      onError: (error) => finish(error),
    })
  })
}

export async function stopTutorSpeech() {
  await Speech.stop()
}

async function findVoice(locale: string) {
  const voices = await Speech.getAvailableVoicesAsync()
  const matching = voices.filter((voice) => voice.language.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase()))
  const localMatching = matching.filter((voice) => !('localService' in voice) || voice.localService)
  const exact = localMatching.find((voice) => voice.language.toLowerCase() === locale.toLowerCase())
  const selected = exact ?? localMatching[0] ?? matching[0]
  if (!selected) throw new Error(`Nenhuma voz instalada para ${locale}.`)
  return selected.identifier
}
