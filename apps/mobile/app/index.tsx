import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, BackHandler, Platform, Pressable, Text, View } from 'react-native'
import { AuthScreen } from '../src/features/auth/auth-screen'
import { useAuthStore } from '../src/features/auth/auth-store'
import { ConversationScreen } from '../src/features/conversation/conversation-screen'
import { OnboardingScreen } from '../src/features/learning/onboarding-screen'
import { useLearningStore } from '../src/features/learning/learning-store'
import { ModelSetupScreen } from '../src/features/model/model-setup-screen'
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
  const [useDemo, setUseDemo] = useState(false)
  const [history, setHistory] = useState<ProductStage[]>([])
  const { profile, hydrated, hydrate } = useLearningStore()
  const { status, modelUri, check } = useModelStore()

  useEffect(() => {
    void hydrate()
    void check()
  }, [check, hydrate])

  useEffect(() => {
    if (hydrated && history.length === 0) setHistory([profile ? 'model' : 'onboarding'])
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

  if (!hydrated || status === 'checking' || !stage) {
    return <View className="flex-1 items-center justify-center bg-cream"><ActivityIndicator color="#5B8E7D" /></View>
  }
  if (stage === 'onboarding') {
    return <OnboardingScreen onBack={history.length > 1 ? goBack : undefined} onComplete={() => push('model')} />
  }
  if (stage === 'model' && profile) {
    return (
      <ModelSetupScreen
        onBack={history.length > 1 ? goBack : undefined}
        onContinue={() => { setUseDemo(false); push('conversation') }}
        onUseDemo={() => { setUseDemo(true); push('conversation') }}
      />
    )
  }
  if (profile) {
    return <ConversationScreen profile={profile} modelUri={status === 'ready' && !useDemo ? modelUri : null} onBack={goBack} />
  }
  return <View className="flex-1 items-center justify-center bg-cream"><ActivityIndicator color="#5B8E7D" /></View>
}

type ProductStage = 'onboarding' | 'model' | 'conversation'

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
