import type { LearningProfile } from '../learning/learning-profile'

export type TutorFeedback = {
  original: string
  corrected: string
  explanationPtBr: string
}

export type TutorResponse = TutorFeedback & {
  spokenReply: string
}

export type ConversationMessage = {
  id: string
  role: 'learner' | 'tutor'
  content: string
  feedback?: TutorFeedback
}

export interface LocalConversationEngine {
  load(modelUri: string): Promise<void>
  generate(messages: ConversationMessage[], profile: LearningProfile): Promise<TutorResponse>
  stop(): Promise<void>
  dispose(): Promise<void>
}

type LlamaModule = typeof import('llama.rn')
type LlamaContext = Awaited<ReturnType<LlamaModule['initLlama']>>

const tutorResponseSchema = {
  type: 'object',
  properties: {
    spokenReply: { type: 'string' },
    original: { type: 'string' },
    corrected: { type: 'string' },
    explanationPtBr: { type: 'string' },
  },
  required: ['spokenReply', 'original', 'corrected', 'explanationPtBr'],
  additionalProperties: false,
} as const

export class LlamaConversationEngine implements LocalConversationEngine {
  private context: LlamaContext | null = null
  private loadedModelUri: string | null = null
  private loadVersion = 0

  async load(modelUri: string) {
    if (this.context && this.loadedModelUri === modelUri) return
    await this.dispose()

    const loadVersion = ++this.loadVersion
    const { initLlama } = await import('llama.rn')
    const context = await initLlama({ model: modelUri, n_ctx: 2048, n_batch: 256, n_gpu_layers: 0, use_mlock: false })
    if (loadVersion !== this.loadVersion) {
      await context.release()
      throw new Error('Carregamento do tutor cancelado.')
    }
    this.context = context
    this.loadedModelUri = modelUri
  }

  async generate(messages: ConversationMessage[], profile: LearningProfile) {
    if (!this.context) throw new Error('O modelo local ainda não foi carregado.')
    const result = await this.context.completion({
      messages: [
        { role: 'system', content: tutorPrompt(profile) },
        ...messages.slice(-10).map((message) => ({
          role: message.role === 'learner' ? 'user' as const : 'assistant' as const,
          content: message.content,
        })),
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { strict: true, schema: tutorResponseSchema },
      },
      n_predict: 220,
      temperature: 0.4,
      top_p: 0.8,
      stop: ['<|im_end|>', '<|endoftext|>'],
    })
    return parseTutorResponse(result.text)
  }

  async stop() {
    await this.context?.stopCompletion()
  }

  async dispose() {
    this.loadVersion += 1
    const context = this.context
    this.context = null
    this.loadedModelUri = null
    try {
      await context?.stopCompletion()
    } finally {
      await context?.release()
    }
  }
}

export class DemoConversationEngine implements LocalConversationEngine {
  async load() {}

  async generate(_messages: ConversationMessage[], profile: LearningProfile) {
    const responses: Record<LearningProfile['targetLanguage'], TutorResponse> = {
      en: { spokenReply: "That's a great start! What do you enjoy doing on weekends?", original: 'like watch', corrected: 'like watching', explanationPtBr: 'Depois de “like”, use o verbo com -ing para falar de uma atividade que você gosta de fazer.' },
      es: { spokenReply: '¡Muy bien! ¿Qué música escuchas normalmente?', original: 'Yo gusto escuchar', corrected: 'Me gusta escuchar', explanationPtBr: 'Em espanhol, usamos “me gusta” para dizer que gostamos de alguma coisa.' },
      fr: { spokenReply: 'Très bien ! Qu’est-ce que tu aimes cuisiner ?', original: 'Je aime', corrected: 'J’aime', explanationPtBr: 'Antes de uma vogal, “je” vira “j’”.' },
      de: { spokenReply: 'Sehr gut! Mit wem spielst du normalerweise Fußball?', original: 'Am Wochenende ich spiele', corrected: 'Am Wochenende spiele ich', explanationPtBr: 'Quando a frase começa com uma expressão de tempo, o verbo vem antes do sujeito.' },
      it: { spokenReply: 'Molto bene! Quale genere di libri ti piace leggere?', original: 'Mi piace di leggere', corrected: 'Mi piace leggere', explanationPtBr: 'Depois de “mi piace”, o infinitivo vem sem “di”.' },
    }
    await new Promise((resolve) => setTimeout(resolve, 450))
    return responses[profile.targetLanguage]
  }

  async stop() {}
  async dispose() {}
}

function parseTutorResponse(value: string): TutorResponse {
  const withoutFence = value.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  try {
    const parsed = JSON.parse(withoutFence) as Partial<TutorResponse>
    if (typeof parsed.spokenReply !== 'string' || !parsed.spokenReply.trim()) throw new Error('Resposta sem texto falado')
    return {
      spokenReply: parsed.spokenReply.trim(),
      original: stringValue(parsed.original),
      corrected: stringValue(parsed.corrected),
      explanationPtBr: stringValue(parsed.explanationPtBr),
    }
  } catch {
    if (withoutFence.startsWith('{') || withoutFence.startsWith('[')) {
      throw new Error('O tutor gerou uma resposta estruturada incompleta.')
    }
    const spokenReply = withoutFence
    if (!spokenReply) throw new Error('O tutor não conseguiu formular uma resposta.')
    return { spokenReply, original: '', corrected: '', explanationPtBr: '' }
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function tutorPrompt(profile: LearningProfile) {
  const levels = { beginner: 'iniciante', intermediate: 'intermediário', advanced: 'avançado' }
  const languages = { en: 'inglês', es: 'espanhol', fr: 'francês', de: 'alemão', it: 'italiano' }
  const nativeLanguages = { 'pt-BR': 'português brasileiro', ...languages }
  return `Você é o Parlo, um tutor paciente de conversação por voz em ${languages[profile.targetLanguage]} para uma pessoa cuja língua materna é ${nativeLanguages[profile.nativeLanguage] ?? 'português brasileiro'}, de nível ${levels[profile.level]}.
As mensagens do aluno são transcrições automáticas e podem conter falhas do reconhecimento. Não corrija pontuação, capitalização ou prováveis erros de transcrição.
Responda no idioma estudado com uma ou duas frases curtas, no máximo 35 palavras, e faça apenas uma pergunta por vez. Não use Markdown, listas ou emojis.
Quando houver um erro relevante de gramática ou vocabulário, copie somente o trecho incorreto em original, escreva a forma natural em corrected e explique brevemente em ${nativeLanguages[profile.nativeLanguage] ?? 'português brasileiro'} em explanationPtBr.
Quando não houver erro relevante, use strings vazias em original, corrected e explanationPtBr. spokenReply deve conter somente o texto que será falado pelo tutor.`
}
