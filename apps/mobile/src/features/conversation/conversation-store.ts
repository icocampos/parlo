import { Platform } from 'react-native'
import { create } from 'zustand'
import type { LearningProfile } from '../learning/learning-profile'
import { DemoConversationEngine, LlamaConversationEngine, type ConversationMessage, type LocalConversationEngine } from './local-conversation-engine'

let engine: LocalConversationEngine | null = null

type ConversationState = {
  messages: ConversationMessage[]
  isGenerating: boolean
  error: string | null
  start(profile: LearningProfile): void
  send(content: string, profile: LearningProfile, modelUri: string | null): Promise<void>
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  messages: [], isGenerating: false, error: null,
  start: (profile) => {
    if (get().messages.length) return
    const greetings = {
      en: 'Hello! I’m your local tutor. What would you like to talk about today?',
      es: '¡Hola! Soy tu tutor local. ¿De qué te gustaría hablar hoy?',
      fr: 'Bonjour ! Je suis ton professeur local. De quoi aimerais-tu parler ?',
      de: 'Hallo! Ich bin dein lokaler Tutor. Worüber möchtest du heute sprechen?',
      it: 'Ciao! Sono il tuo tutor locale. Di cosa vorresti parlare oggi?',
    }
    set({ messages: [{ id: messageId(), role: 'tutor', content: greetings[profile.targetLanguage] }] })
  },
  send: async (content, profile, modelUri) => {
    const trimmed = content.trim()
    if (!trimmed || get().isGenerating) return
    const learner: ConversationMessage = { id: messageId(), role: 'learner', content: trimmed }
    const tutorId = messageId()
    const nextMessages = [...get().messages, learner]
    set({ messages: [...nextMessages, { id: tutorId, role: 'tutor', content: '' }], isGenerating: true, error: null })

    try {
      if (!engine) engine = Platform.OS === 'web' || !modelUri ? new DemoConversationEngine() : new LlamaConversationEngine()
      await engine.load(modelUri ?? 'demo')
      let streamed = ''
      const finalText = await engine.generate(nextMessages, profile, (token) => {
        streamed += token
        set((state) => ({ messages: state.messages.map((message) => message.id === tutorId ? { ...message, content: streamed } : message) }))
      })
      set((state) => ({ isGenerating: false, messages: state.messages.map((message) => message.id === tutorId ? { ...message, content: finalText } : message) }))
    } catch {
      engine = new DemoConversationEngine()
      set({ error: 'A IA local não pôde iniciar; usando o modo demonstração.' })
      let streamed = ''
      const finalText = await engine.generate(nextMessages, profile, (token) => {
        streamed += token
        set((state) => ({ messages: state.messages.map((message) => message.id === tutorId ? { ...message, content: streamed } : message) }))
      })
      set((state) => ({ isGenerating: false, messages: state.messages.map((message) => message.id === tutorId ? { ...message, content: finalText } : message) }))
    }
  },
}))

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
