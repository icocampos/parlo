import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, BackHandler, Platform, Pressable, Text, View } from 'react-native'
import { AuthScreen } from '../src/features/auth/auth-screen'
import { useAuthStore } from '../src/features/auth/auth-store'
import { ConversationScreen } from '../src/features/conversation/conversation-screen'
import { OnboardingScreen } from '../src/features/learning/onboarding-screen'
import { useLearningStore } from '../src/features/learning/learning-store'
import { useModelStore } from '../src/features/model/model-store'

export default function Index() {
  const { user, restore, developmentVerificationBypass } = useAuthStore()

  useEffect(() => {
    void restore()
  }, [restore])

  return (
    <>
      <StatusBar style="dark" />
      {user && (user.emailVerified || developmentVerificationBypass) ? (
        <ProductApp />
      ) : user ? <VerifyEmailScreen /> : <AuthScreen />}
    </>
  )
}

function ProductApp() {
  const [history, setHistory] = useState<ProductStage[]>([])
  const { profile, hydrated, hydrate } = useLearningStore()
  const { status, modelUri, speechModelUri, check, download, progress, speechProgress, preparationStage, error } = useModelStore()

  useEffect(() => {
    void hydrate()
    void check()
  }, [check, hydrate])

  useEffect(() => {
    if (hydrated && history.length === 0) setHistory([profile ? 'conversation' : 'onboarding'])
  }, [history.length, hydrated, profile])

  const goBack = () => {
    if (history.length <= 1) return false
    setHistory((current) => current.slice(0, -1))
    return true
  }

  useEffect(() => {
    if (Platform.OS === 'web') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', goBack)
    return () => subscription.remove()
  }, [history.length])

  const push = (stage: ProductStage) => setHistory((current) => current.at(-1) === stage ? current : [...current, stage])
  const stage = history.at(-1)

  useEffect(() => {
    if (profile && stage === 'conversation' && status === 'missing') void download()
  }, [profile, stage, status, download])

  if (!hydrated || status === 'checking' || !stage) {
    return <View className="flex-1 items-center justify-center bg-cream"><ActivityIndicator color="#5B8E7D" /></View>
  }
  if (stage === 'onboarding') {
    return <OnboardingScreen onBack={history.length > 1 ? goBack : undefined} onComplete={() => push('conversation')} />
  }
  if (profile && Platform.OS !== 'web' && status !== 'ready') {
    return <View className="flex-1 items-center justify-center bg-cream px-8">
      <Text className="text-2xl font-bold text-ink">Preparando sua conversa</Text>
      <Text className="mt-4 text-center text-base text-ink/60">{Platform.OS === 'android' ? 'Estamos preparando os recursos do aplicativo no seu aparelho. Isso pode levar alguns minutos no primeiro acesso.' : 'Na primeira vez, precisamos baixar os recursos de voz e conversação. Mantenha o aplicativo aberto e use Wi-Fi.'}</Text>
      {status === 'error' ? <><Text className="mt-4 text-center text-sm text-coral">{error ?? 'Não foi possível preparar os recursos.'}</Text><Pressable className="mt-6 rounded-2xl bg-ink px-6 py-4" onPress={() => void download()}><Text className="font-semibold text-white">Tentar novamente</Text></Pressable></> : <View className="mt-8 w-full max-w-sm"><View className="flex-row justify-between"><Text className="text-sm font-semibold text-ink">{Platform.OS === 'android' ? preparationStage : 'Baixando recursos'}</Text><Text className="text-sm font-semibold text-sage">{Math.round((Platform.OS === 'android' ? progress : progress * 0.89 + speechProgress * 0.11) * 100)}%</Text></View><View className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10"><View className="h-3 rounded-full bg-sage" style={{ width: `${Math.round((Platform.OS === 'android' ? progress : progress * 0.89 + speechProgress * 0.11) * 100)}%` }} /></View></View>}
    </View>
  }
  if (profile) {
    return (
      <ConversationScreen
        profile={profile}
        modelUri={status === 'ready' ? modelUri : null}
        speechModelUri={status === 'ready' ? speechModelUri : null}
        onBack={goBack}
      />
    )
  }
  return <View className="flex-1 items-center justify-center bg-cream"><ActivityIndicator color="#5B8E7D" /></View>
}

type ProductStage = 'onboarding' | 'conversation'

function VerifyEmailScreen() {
  const {
    user,
    resendVerification,
    checkVerification,
    continueWithoutVerificationForDevelopment,
    isLoading,
    error,
  } = useAuthStore()

  return (
    <View className="flex-1 justify-center bg-cream px-6">
      <Text className="text-sm font-semibold uppercase tracking-widest text-sage">Só falta um passo</Text>
      <Text className="mt-3 text-4xl font-bold text-ink">Confirme seu e-mail.</Text>
      <Text className="mt-4 text-base leading-6 text-ink/60">
        Enviamos um link para {user?.email}. Abra o e-mail e depois volte ao aplicativo.
      </Text>
      {error && <Text className="mt-4 text-sm text-red-700">{error}</Text>}
      <Pressable
        className="mt-8 min-h-14 items-center justify-center rounded-2xl bg-ink px-6 disabled:opacity-50"
        disabled={isLoading}
        onPress={() => void checkVerification()}
      >
        {isLoading ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">Já confirmei</Text>}
      </Pressable>
      <Pressable className="mt-4 items-center py-3" disabled={isLoading} onPress={() => void resendVerification()}>
        <Text className="font-semibold text-sage">Reenviar e-mail</Text>
      </Pressable>
      {__DEV__ && (
        <Pressable className="mt-2 items-center py-3" onPress={continueWithoutVerificationForDevelopment}>
          <Text className="text-sm font-semibold text-ink/60">Continuar sem verificar (desenvolvimento)</Text>
        </Pressable>
      )}
    </View>
  )
}
