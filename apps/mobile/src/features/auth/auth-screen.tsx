import { Pressable, Text, View } from 'react-native'

type ProviderButtonProps = {
  label: string
  onPress: () => void
}

function ProviderButton({ label, onPress }: ProviderButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="mb-3 min-h-14 items-center justify-center rounded-2xl bg-ink px-6 active:opacity-80"
      onPress={onPress}
    >
      <Text className="text-base font-semibold text-white">{label}</Text>
    </Pressable>
  )
}

export function AuthScreen() {
  const handleUnconfiguredProvider = () => {
    // Os fluxos reais entram quando os client IDs e callbacks estiverem definidos.
  }

  return (
    <View className="flex-1 justify-between bg-cream px-6 pb-10 pt-20">
      <View>
        <Text className="text-sm font-semibold uppercase tracking-widest text-sage">Aprenda conversando</Text>
        <Text className="mt-4 text-5xl font-bold leading-tight text-ink">Sua próxima língua começa com uma conversa.</Text>
        <Text className="mt-5 text-lg leading-7 text-ink/70">
          Pratique no seu ritmo com um tutor de IA que funciona no seu aparelho.
        </Text>
      </View>

      <View>
        <ProviderButton label="Continuar com Google" onPress={handleUnconfiguredProvider} />
        <ProviderButton label="Continuar com Apple" onPress={handleUnconfiguredProvider} />
        <Text className="mt-3 text-center text-xs leading-5 text-ink/50">
          Ao continuar, você concorda com os Termos e a Política de Privacidade.
        </Text>
      </View>
    </View>
  )
}
