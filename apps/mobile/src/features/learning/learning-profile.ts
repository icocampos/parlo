export const languages = [
  { code: 'en', label: 'Inglês' },
  { code: 'es', label: 'Espanhol' },
  { code: 'fr', label: 'Francês' },
  { code: 'de', label: 'Alemão' },
  { code: 'it', label: 'Italiano' },
] as const

export type TargetLanguage = typeof languages[number]['code']
export type NativeLanguage = TargetLanguage | 'pt-BR'
export type LearningLevel = 'beginner' | 'intermediate' | 'advanced'

export type LearningProfile = {
  nativeLanguage: NativeLanguage
  targetLanguage: TargetLanguage
  level: LearningLevel
}

export function languageName(code: TargetLanguage) {
  return languages.find((language) => language.code === code)?.label ?? code
}
