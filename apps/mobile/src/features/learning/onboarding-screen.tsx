import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { languages, type LearningLevel, type TargetLanguage } from './learning-profile'
import { useLearningStore } from './learning-store'

const levels: Array<{ value: LearningLevel; label: string; description: string }> = [
  { value: 'beginner', label: 'Iniciante', description: 'Quero começar com frases simples' },
  { value: 'intermediate', label: 'Intermediário', description: 'Já consigo manter uma conversa' },
  { value: 'advanced', label: 'Avançado', description: 'Quero ganhar naturalidade e precisão' },
]

export function OnboardingScreen({ onBack, onComplete }: { onBack?: () => void; onComplete: () => void }) {
  const save = useLearningStore((state) => state.save)
  const [language, setLanguage] = useState<TargetLanguage>('en')
  const [level, setLevel] = useState<LearningLevel>('beginner')

  const continueToModel = async () => {
    await save(language, level)
    onComplete()
  }

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="px-6 pb-12 pt-16">
      {onBack && <BackButton onPress={onBack} />}
      <Text className="text-sm font-semibold uppercase tracking-widest text-sage">Seu plano de estudo</Text>
      <Text className="mt-3 text-4xl font-bold text-ink">O que você quer aprender?</Text>
      <Text className="mb-7 mt-3 text-base text-ink/60">Isso personaliza o tutor que funcionará no seu aparelho.</Text>

      <Text className="mb-3 text-sm font-bold text-ink">Idioma</Text>
      <View className="mb-7 flex-row flex-wrap gap-3">
        {languages.map((item) => (
          <Choice key={item.code} selected={language === item.code} label={item.label} onPress={() => setLanguage(item.code)} />
        ))}
      </View>

      <Text className="mb-3 text-sm font-bold text-ink">Seu nível</Text>
      {levels.map((item) => (
        <Pressable key={item.value} className={`mb-3 rounded-2xl border p-4 ${level === item.value ? 'border-sage bg-white' : 'border-ink/10 bg-white/50'}`} onPress={() => setLevel(item.value)}>
          <Text className="font-bold text-ink">{item.label}</Text>
          <Text className="mt-1 text-sm text-ink/60">{item.description}</Text>
        </Pressable>
      ))}

      <Pressable className="mt-5 min-h-14 items-center justify-center rounded-2xl bg-ink" onPress={() => void continueToModel()}>
        <Text className="font-semibold text-white">Continuar</Text>
      </Pressable>
    </ScrollView>
  )
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Voltar" className="mb-7 h-11 w-11 items-center justify-center rounded-full bg-white" onPress={onPress}>
      <Text className="text-2xl text-ink">‹</Text>
    </Pressable>
  )
}

function Choice({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable className={`rounded-full border px-4 py-3 ${selected ? 'border-sage bg-sage' : 'border-ink/10 bg-white'}`} onPress={onPress}>
      <Text className={selected ? 'font-semibold text-white' : 'font-semibold text-ink'}>{label}</Text>
    </Pressable>
  )
}
