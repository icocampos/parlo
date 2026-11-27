import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { DEFAULT_MODEL, SPEECH_MODEL } from './model-catalog'
import { useModelStore } from './model-store'

export function ModelSetupScreen({ onBack, onContinue, onUseDemo }: { onBack?: () => void; onContinue: () => void; onUseDemo: () => void }) {
  const { status, progress, speechProgress, modelUri, speechModelUri, error, download } = useModelStore()
  const downloading = status === 'downloading'

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="grow justify-center px-6 py-8" showsVerticalScrollIndicator={false}>
      {onBack && (
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" className="mb-7 h-11 w-11 items-center justify-center rounded-full bg-white" onPress={onBack}>
          <Text className="text-2xl text-ink">‹</Text>
        </Pressable>
      )}
      <Text className="text-sm font-semibold uppercase tracking-widest text-sage">IA privada e local</Text>
      <Text className="mt-3 text-4xl font-bold text-ink">Prepare seu tutor de voz.</Text>
      <Text className="mt-4 text-base leading-6 text-ink/60">
        Baixe os dois modelos uma única vez. Sua fala e a resposta do tutor serão processadas no aparelho.
      </Text>

      <View className="my-7 gap-3">
        <ModelCard
          label="Tutor de conversa"
          name={DEFAULT_MODEL.name}
          details={`${DEFAULT_MODEL.sizeLabel} · ${DEFAULT_MODEL.license}`}
          progress={progress}
          ready={Boolean(modelUri)}
          downloading={downloading}
        />
        <ModelCard
          label="Reconhecimento de voz"
          name={SPEECH_MODEL.name}
          details={`${SPEECH_MODEL.sizeLabel} · ${SPEECH_MODEL.license}`}
          progress={speechProgress}
          ready={Boolean(speechModelUri)}
          downloading={downloading}
        />
      </View>

      {error && <Text className="mb-4 text-sm text-red-700">{error}</Text>}
      <Pressable
        className="min-h-14 items-center justify-center rounded-2xl bg-ink disabled:opacity-50"
        disabled={downloading}
        onPress={status === 'ready' ? onContinue : () => void download()}
      >
        {downloading
          ? <ActivityIndicator color="white" />
          : <Text className="font-semibold text-white">{status === 'ready' ? 'Iniciar conversa por voz' : 'Baixar modelos'}</Text>}
      </Pressable>
      <Pressable className="mt-3 items-center py-3" disabled={downloading} onPress={onUseDemo}>
        <Text className="font-semibold text-sage">Explorar a experiência em demonstração</Text>
      </Pressable>
      <Text className="mt-3 text-center text-xs leading-5 text-ink/40">Recomendamos Wi-Fi e pelo menos 1 GB de espaço livre.</Text>
    </ScrollView>
  )
}

function ModelCard({ label, name, details, progress, ready, downloading }: {
  label: string
  name: string
  details: string
  progress: number
  ready: boolean
  downloading: boolean
}) {
  return (
    <View className="rounded-2xl bg-white p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-sage">{label}</Text>
          <Text className="mt-1 font-bold text-ink">{name}</Text>
          <Text className="mt-1 text-sm text-ink/60">{details}</Text>
        </View>
        {ready && <Text className="text-sm font-semibold text-sage">Pronto</Text>}
      </View>
      {downloading && !ready && (
        <View className="mt-4">
          <View className="h-2 overflow-hidden rounded-full bg-ink/10">
            <View className="h-2 rounded-full bg-coral" style={{ width: `${Math.round(progress * 100)}%` }} />
          </View>
          <Text className="mt-2 text-xs text-ink/50">{Math.round(progress * 100)}% concluído</Text>
        </View>
      )}
    </View>
  )
}
