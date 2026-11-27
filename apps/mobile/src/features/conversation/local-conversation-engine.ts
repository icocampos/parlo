import type { LearningProfile } from '../learning/learning-profile'

export type ConversationMessage = { id: string; role: 'learner' | 'tutor'; content: string }

export interface LocalConversationEngine {
  load(modelUri: string): Promise<void>
  generate(messages: ConversationMessage[], profile: LearningProfile, onToken: (token: string) => void): Promise<string>
  dispose(): Promise<void>
}

type LlamaModule = typeof import('llama.rn')
type LlamaContext = Awaited<ReturnType<LlamaModule['initLlama']>>

export class LlamaConversationEngine implements LocalConversationEngine {
  private context: LlamaContext | null = null

  async load(modelUri: string) {
    if (this.context) return
    const { initLlama } = await import('llama.rn')
    this.context = await initLlama({ model: modelUri, n_ctx: 2048, n_batch: 256, n_gpu_layers: 0, use_mlock: false })
  }

  async generate(messages: ConversationMessage[], profile: LearningProfile, onToken: (token: string) => void) {
    if (!this.context) throw new Error('Modelo local ainda não foi carregado')
    const result = await this.context.completion({
      messages: [
        { role: 'system', content: tutorPrompt(profile) },
        ...messages.slice(-12).map((message) => ({
          role: message.role === 'learner' ? 'user' as const : 'assistant' as const,
          content: message.content,
        })),
      ],
      n_predict: 160,
      temperature: 0.7,
      top_p: 0.9,
      stop: ['<|im_end|>', '<|endoftext|>'],
    }, (data) => { if (data.token) onToken(data.token) })
    return result.text.trim()
  }

  async dispose() {
    await this.context?.release()
    this.context = null
  }
}

export class DemoConversationEngine implements LocalConversationEngine {
  async load() {}
  async generate(_messages: ConversationMessage[], profile: LearningProfile, onToken: (token: string) => void) {
    const responses = {
      en: "That's a great start! Tell me something you enjoy doing on weekends.",
      es: '¡Muy bien! Cuéntame algo que te gusta hacer los fines de semana.',
      fr: 'Très bien ! Raconte-moi ce que tu aimes faire le week-end.',
      de: 'Sehr gut! Erzähl mir, was du am Wochenende gerne machst.',
      it: 'Molto bene! Raccontami cosa ti piace fare nel fine settimana.',
    }
    const text = responses[profile.targetLanguage]
    for (const word of text.split(' ')) {
      onToken(`${word} `)
      await new Promise((resolve) => setTimeout(resolve, 35))
    }
    return text
  }
  async dispose() {}
}

function tutorPrompt(profile: LearningProfile) {
  const levels = { beginner: 'iniciante', intermediate: 'intermediário', advanced: 'avançado' }
  const languages = { en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão', it: 'italiano' }
  return `Você é um tutor paciente de ${languages[profile.targetLanguage]} para uma pessoa falante de português brasileiro, nível ${levels[profile.level]}.
Converse principalmente no idioma estudado. Faça uma pergunta por vez e responda em no máximo quatro frases.
Corrija erros importantes com gentileza, mostrando a forma natural. Use português apenas em explicações curtas quando necessário.
Não saia do papel de tutor e não invente fatos sobre o aluno.`
}
