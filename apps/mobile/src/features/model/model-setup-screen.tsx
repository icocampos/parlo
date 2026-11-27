import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { DEFAULT_MODEL } from './model-catalog'
import { useModelStore } from './model-store'

export function ModelSetupScreen({ onBack, onContinue, onUseDemo }: { onBack?: () => void; onContinue: () => void; onUseDemo: () => void }) {
  const { status, progress, error, download } = useModelStore()
  const downloading = status === 'downloading'

  return (
    <View className="flex-1 justify-center bg-cream px-6">
      {onBack && (
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" className="mb-7 h-11 w-11 items-center justify-center rounded-full bg-white" onPress={onBack}>
          <Text className="text-2xl text-ink">‹</Text>
        </Pressable>
      )}
      <Text className="text-sm font-semibold uppercase tracking-widest text-sage">IA privada e local</Text>
      <Text className="mt-3 text-4xl font-bold text-ink">Prepare seu tutor.</Text>
      <Text className="mt-4 text-base leading-6 text-ink/60">
        Baixe {DEFAULT_MODEL.name} uma única vez. Depois disso, suas conversas são processadas no aparelho e funcionam offline.
      </Text>

      <View className="my-7 rounded-2xl bg-white p-5">
        <Text className="font-bold text-ink">{DEFAULT_MODEL.name}</Text>
        <Text className="mt-1 text-sm text-ink/60">{DEFAULT_MODEL.sizeLabel} · {DEFAULT_MODEL.license}</Text>
        {downloading && (
          <View className="mt-4">
            <View className="h-2 overflow-hidden rounded-full bg-ink/10">
              <View className="h-2 rounded-full bg-coral" style={{ width: `${Math.round(progress * 100)}%` }} />
            </View>
            <Text className="mt-2 text-xs text-ink/50">{Math.round(progress * 100)}% concluído</Text>
          </View>
        )}
      </View>

      {error && <Text className="mb-4 text-sm text-red-700">{error}</Text>}
      <Pressable
        className="min-h-14 items-center justify-center rounded-2xl bg-ink disabled:opacity-50"
        disabled={downloading}
        onPress={status === 'ready' ? onContinue : () => void download()}
      >
        {downloading ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">{status === 'ready' ? 'Iniciar conversa' : 'Baixar modelo'}</Text>}
      </Pressable>
      <Pressable className="mt-3 items-center py-3" disabled={downloading} onPress={onUseDemo}>
        <Text className="font-semibold text-sage">Explorar em modo demonstração</Text>
      </Pressable>
      <Text className="mt-3 text-center text-xs leading-5 text-ink/40">Recomendamos Wi-Fi e pelo menos 1 GB de espaço livre.</Text>
    </View>
  )
}
