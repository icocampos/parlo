import { File } from 'expo-file-system'
import { Platform } from 'react-native'
import { create } from 'zustand'
import type { LearningProfile } from '../learning/learning-profile'
import { LocalSpeechRecognitionEngine } from '../voice/speech-recognition-engine'
import { speakTutorText, stopTutorSpeech } from '../voice/speech-synthesis-engine'
import { describeNativeError } from '../voice/native-file-path'
import { DemoConversationEngine, LlamaConversationEngine, type ConversationMessage, type LocalConversationEngine } from './local-conversation-engine'

export type ConversationPhase = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error'

type ConversationState = {
  messages: ConversationMessage[]
  phase: ConversationPhase
  error: string | null
  start(profile: LearningProfile): boolean
  beginListening(): Promise<void>
  processRecording(audioUri: string, profile: LearningProfile, modelUri: string, speechModelUri: string): Promise<void>
  processDemoTurn(profile: LearningProfile): Promise<void>
  replayLastTutor(profile: LearningProfile): Promise<void>
  replayCorrection(profile: LearningProfile): Promise<void>
  reportError(message: string): void
  stopSpeaking(): Promise<void>
  cancelActiveTurn(): Promise<void>
}

let conversationEngine: LocalConversationEngine | null = null
let loadedConversationModel: string | null = null
const speechRecognitionEngine = new LocalSpeechRecognitionEngine()
let activeProfile = ''
let operationVersion = 0

export const useConversationStore = create<ConversationState>((set, get) => ({
  messages: [],
  phase: 'idle',
  error: null,
  start: (profile) => {
    const profileKey = `${profile.targetLanguage}:${profile.level}`
    if (activeProfile === profileKey && get().messages.length) return false
    operationVersion += 1
    void cancelRuntimeWork()
    activeProfile = profileKey
    set({
      messages: [{ id: messageId(), role: 'tutor', content: greetingFor(profile) }],
      phase: 'idle',
      error: null,
    })
    return true
  },
  beginListening: async () => {
    const operation = ++operationVersion
    await cancelRuntimeWork()
    if (!isCurrentOperation(operation)) return
    set({ phase: 'listening', error: null })
  },
  processRecording: async (audioUri, profile, modelUri, speechModelUri) => {
    const operation = operationVersion
    set({ phase: 'transcribing', error: null })
    try {
      await releaseConversationEngine()
      if (!isCurrentOperation(operation)) return
      await speechRecognitionEngine.load(speechModelUri)
      const transcript = await speechRecognitionEngine.transcribe(audioUri, profile.targetLanguage)
      await speechRecognitionEngine.dispose()
      if (!isCurrentOperation(operation)) return
      if (!transcript) throw new Error('Não consegui identificar sua fala. Tente novamente mais perto do microfone.')
      await runTutorTurn(transcript, profile, modelUri, operation)
    } catch (error) {
      if (isCurrentOperation(operation)) set({ phase: 'error', error: readableError(error, 'Não foi possível entender sua fala.') })
    } finally {
      try { await speechRecognitionEngine.dispose() } catch { /* Não impedir novas tentativas se a liberação falhar. */ }
      deleteTemporaryRecording(audioUri)
    }
  },
  processDemoTurn: async (profile) => {
    const operation = operationVersion
    set({ phase: 'transcribing', error: null })
    await wait(500)
    if (!isCurrentOperation(operation)) return
    await runTutorTurn(demoTranscript(profile), profile, null, operation)
  },
  replayLastTutor: async (profile) => {
    const tutorMessage = [...get().messages].reverse().find((message) => message.role === 'tutor')
    if (!tutorMessage || get().phase === 'listening') return
    const operation = ++operationVersion
    await cancelRuntimeWork()
    if (!isCurrentOperation(operation)) return
    set({ phase: 'speaking', error: null })
    try {
      await speakTutorText(tutorMessage.content, profile.targetLanguage)
      if (isCurrentOperation(operation)) set({ phase: 'idle' })
    } catch {
      if (isCurrentOperation(operation)) set({ phase: 'idle', error: 'A voz deste idioma não está disponível. Instale-a nas configurações de texto para voz do aparelho.' })
    }
  },
  replayCorrection: async (profile) => {
    const correction = [...get().messages].reverse().find((message) => message.role === 'tutor' && message.feedback?.corrected)?.feedback?.corrected
    if (!correction || get().phase === 'listening') return
    const operation = ++operationVersion
    await cancelRuntimeWork()
    if (!isCurrentOperation(operation)) return
    set({ phase: 'speaking', error: null })
    try {
      await speakTutorText(correction, profile.targetLanguage)
      if (isCurrentOperation(operation)) set({ phase: 'idle' })
    } catch {
      if (isCurrentOperation(operation)) set({ phase: 'idle', error: 'Não foi possível reproduzir a correção neste idioma.' })
    }
  },
  reportError: (message) => {
    operationVersion += 1
    void cancelRuntimeWork()
    set({ phase: 'error', error: message })
  },
  stopSpeaking: async () => {
    operationVersion += 1
    await stopTutorSpeech()
    if (get().phase === 'speaking') set({ phase: 'idle' })
  },
  cancelActiveTurn: async () => {
    const operation = ++operationVersion
    await cancelRuntimeWork()
    await Promise.allSettled([releaseConversationEngine(), speechRecognitionEngine.dispose()])
    if (isCurrentOperation(operation)) set({ phase: 'idle', error: null })
  },
}))

async function runTutorTurn(transcript: string, profile: LearningProfile, modelUri: string | null, operation: number) {
  if (!isCurrentOperation(operation)) return
  const learner: ConversationMessage = { id: messageId(), role: 'learner', content: transcript }
  const messages = [...useConversationStore.getState().messages, learner]
  useConversationStore.setState({ messages, phase: 'thinking', error: null })

  let warning: string | null = null
  let response
  try {
    const engine = await getConversationEngine(modelUri)
    if (!isCurrentOperation(operation)) return
    response = await engine.generate(messages, profile)
  } catch {
    if (!isCurrentOperation(operation)) return
    await releaseConversationEngine()
    conversationEngine = new DemoConversationEngine()
    loadedConversationModel = 'demo'
    await conversationEngine.load('demo')
    response = await conversationEngine.generate(messages, profile)
    warning = 'O tutor local não conseguiu iniciar; esta resposta usa a demonstração.'
  }

  if (!isCurrentOperation(operation)) return

  const tutor: ConversationMessage = {
    id: messageId(),
    role: 'tutor',
    content: response.spokenReply,
    feedback: {
      original: response.original,
      corrected: response.corrected,
      explanationPtBr: response.explanationPtBr,
    },
  }
  useConversationStore.setState({ messages: [...messages, tutor], phase: 'speaking', error: warning })

  try {
    await speakTutorText(response.spokenReply, profile.targetLanguage)
    if (isCurrentOperation(operation)) useConversationStore.setState({ phase: 'idle' })
  } catch {
    if (isCurrentOperation(operation)) useConversationStore.setState({
      phase: 'idle',
      error: 'A resposta foi gerada, mas a voz deste idioma não está instalada no aparelho.',
    })
  }
}

async function getConversationEngine(modelUri: string | null) {
  const engineKey = Platform.OS === 'web' || !modelUri ? 'demo' : modelUri
  if (!conversationEngine || loadedConversationModel !== engineKey) {
    await releaseConversationEngine()
    conversationEngine = engineKey === 'demo' ? new DemoConversationEngine() : new LlamaConversationEngine()
    loadedConversationModel = engineKey
  }
  await conversationEngine.load(engineKey)
  return conversationEngine
}

function greetingFor(profile: LearningProfile) {
  const greetings = {
    en: "Hello! I'm Parlo. Tap the microphone and tell me how your day is going.",
    es: '¡Hola! Soy Parlo. Toca el micrófono y cuéntame cómo va tu día.',
    fr: 'Bonjour ! Je suis Parlo. Touche le micro et raconte-moi ta journée.',
    de: 'Hallo! Ich bin Parlo. Tippe auf das Mikrofon und erzähl mir von deinem Tag.',
    it: 'Ciao! Sono Parlo. Tocca il microfono e raccontami com’è la tua giornata.',
  }
  return greetings[profile.targetLanguage]
}

function demoTranscript(profile: LearningProfile) {
  const transcripts = {
    en: 'I like watch movies on the weekend.',
    es: 'Yo gusto escuchar música.',
    fr: 'Je aime cuisiner avec mes amis.',
    de: 'Am Wochenende ich spiele gern Fußball.',
    it: 'Mi piace di leggere nel fine settimana.',
  }
  return transcripts[profile.targetLanguage]
}

function deleteTemporaryRecording(uri: string) {
  try {
    const recording = new File(uri)
    if (recording.exists) recording.delete()
  } catch {
    // O sistema também pode limpar sozinho os arquivos temporários de áudio.
  }
}

function readableError(error: unknown, fallback: string) {
  const detail = describeNativeError(error)
  return detail === 'erro sem detalhes' ? fallback : detail
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isCurrentOperation(operation: number) {
  return operation === operationVersion
}

async function cancelRuntimeWork() {
  await Promise.allSettled([
    stopTutorSpeech(),
    speechRecognitionEngine.cancel(),
    conversationEngine?.stop() ?? Promise.resolve(),
  ])
}

async function releaseConversationEngine() {
  const engine = conversationEngine
  conversationEngine = null
  loadedConversationModel = null
  await engine?.dispose()
}

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
