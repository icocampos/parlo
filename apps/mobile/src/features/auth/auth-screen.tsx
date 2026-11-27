import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useAuthStore } from './auth-store'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, register, isLoading, error, clearError } = useAuthStore()

  const submit = async () => {
    try {
      if (mode === 'register') await register({ name, email, password })
      else await login({ email, password })
    } catch {
      // A mensagem é exibida pelo estado da store.
    }
  }

  const changeMode = () => {
    clearError()
    setMode((current) => current === 'login' ? 'register' : 'login')
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-cream" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" keyboardShouldPersistTaps="handled">
        <Text className="text-sm font-semibold uppercase tracking-widest text-sage">Parlo</Text>
        <Text className="mt-3 text-4xl font-bold text-ink">
          {mode === 'login' ? 'Bem-vindo de volta.' : 'Comece a conversar.'}
        </Text>
        <Text className="mb-8 mt-3 text-base leading-6 text-ink/60">
          {mode === 'login' ? 'Entre para continuar seus estudos.' : 'Crie sua conta para salvar seu progresso.'}
        </Text>

        {mode === 'register' && <Field label="Nome" value={name} onChangeText={setName} autoComplete="name" />}
        <Field label="E-mail" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" />
        <Field
          label="Senha"
          value={password}
          onChangeText={setPassword}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          secureTextEntry
        />

        {error && <Text className="mb-4 text-sm text-red-700">{error}</Text>}

        <Pressable
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-2xl bg-ink px-6 active:opacity-80 disabled:opacity-50"
          disabled={isLoading}
          onPress={submit}
        >
          {isLoading ? <ActivityIndicator color="white" /> : (
            <Text className="text-base font-semibold text-white">{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
          )}
        </Pressable>

        <Pressable className="mt-5 items-center py-2" onPress={changeMode}>
          <Text className="text-sm font-semibold text-sage">
            {mode === 'login' ? 'Ainda não tenho uma conta' : 'Já tenho uma conta'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string }

function Field({ label, ...props }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-ink">{label}</Text>
      <TextInput
        className="min-h-14 rounded-2xl border border-ink/15 bg-white px-4 text-base text-ink"
        autoCapitalize="none"
        placeholderTextColor="#7A8090"
        {...props}
      />
    </View>
  )
}
