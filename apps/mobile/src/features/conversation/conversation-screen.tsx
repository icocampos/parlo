import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native'
import type { LearningProfile } from '../learning/learning-profile'
import { languageName } from '../learning/learning-profile'
import { useConversationStore } from './conversation-store'

export function ConversationScreen({ profile, modelUri, onBack }: { profile: LearningProfile; modelUri: string | null; onBack: () => void }) {
  const [input, setInput] = useState('')
  const list = useRef<FlatList>(null)
  const { messages, isGenerating, error, start, send } = useConversationStore()

  useEffect(() => { start(profile) }, [profile, start])

  const submit = () => {
    const value = input
    setInput('')
    void send(value, profile, modelUri)
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-cream" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="border-b border-ink/10 bg-cream px-5 pb-4 pt-14">
        <View className="flex-row items-center gap-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" className="h-11 w-11 items-center justify-center rounded-full bg-white" onPress={onBack}>
            <Text className="text-2xl text-ink">‹</Text>
          </Pressable>
          <View>
            <Text className="text-xs font-semibold uppercase tracking-widest text-sage">Conversa local</Text>
            <Text className="mt-1 text-xl font-bold text-ink">Tutor de {languageName(profile.targetLanguage)}</Text>
            <Text className="mt-1 text-xs text-ink/50">{modelUri ? 'IA no aparelho · offline' : 'Modo demonstração'}</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 p-5"
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View className={`max-w-[88%] rounded-2xl px-4 py-3 ${item.role === 'learner' ? 'ml-auto bg-ink' : 'mr-auto bg-white'}`}>
            {item.content ? <Text className={item.role === 'learner' ? 'text-base leading-6 text-white' : 'text-base leading-6 text-ink'}>{item.content}</Text> : <ActivityIndicator color="#5B8E7D" />}
          </View>
        )}
      />
      {error && <Text className="px-5 pb-2 text-xs text-coral">{error}</Text>}
      <View className="flex-row items-end gap-3 border-t border-ink/10 bg-white p-4">
        <TextInput
          className="max-h-28 min-h-12 flex-1 rounded-2xl bg-cream px-4 py-3 text-base text-ink"
          placeholder="Escreva no idioma que está aprendendo..."
          placeholderTextColor="#7A8090"
          multiline
          value={input}
          onChangeText={setInput}
        />
        <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-coral disabled:opacity-40" disabled={isGenerating || !input.trim()} onPress={submit}>
          <Text className="text-xl font-bold text-white">↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
