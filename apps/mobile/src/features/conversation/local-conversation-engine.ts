export type ConversationMessage = {
  id: string
  role: 'learner' | 'tutor'
  content: string
}

export type ConversationContext = {
  nativeLanguage: string
  targetLanguage: string
  level: 'beginner' | 'intermediate' | 'advanced'
}

export interface LocalConversationEngine {
  isReady(): Promise<boolean>
  loadModel(onProgress?: (progress: number) => void): Promise<void>
  reply(messages: ConversationMessage[], context: ConversationContext): AsyncIterable<string>
  dispose(): Promise<void>
}

// A implementação baseada em llama.rn entra aqui depois de validar modelo,
// memória e velocidade nos aparelhos mínimos suportados.
