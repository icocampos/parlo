import type { AuthUser, LoginInput, RegisterInput } from '@parlo/shared'
import { create } from 'zustand'
import { authApi } from '../../lib/api'
import { sessionStorage } from '../../lib/session-storage'

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  error: string | null
  developmentVerificationBypass: boolean
  login(input: LoginInput): Promise<void>
  register(input: RegisterInput): Promise<void>
  restore(): Promise<void>
  resendVerification(): Promise<void>
  checkVerification(): Promise<void>
  continueWithoutVerificationForDevelopment(): void
  clearError(): void
}

export const useAuthStore = create<AuthState>((set) => {
  async function apply(action: () => ReturnType<typeof authApi.login>) {
    set({ isLoading: true, error: null })
    try {
      const session = await action()
      await sessionStorage.setRefreshToken(session.refreshToken)
      set({ user: session.user, accessToken: session.accessToken, isLoading: false })
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Erro inesperado' })
      throw error
    }
  }

  return {
    user: null,
    accessToken: null,
    isLoading: false,
    error: null,
    developmentVerificationBypass: false,
    login: (input) => apply(() => authApi.login(input)),
    register: (input) => apply(() => authApi.register(input)),
    restore: async () => {
      const refreshToken = await sessionStorage.getRefreshToken()
      if (!refreshToken) return
      try { await apply(() => authApi.refresh(refreshToken)) }
      catch { await sessionStorage.clear() }
    },
    resendVerification: async () => {
      const user = useAuthStore.getState().user
      if (!user) return
      set({ isLoading: true, error: null })
      try {
        await authApi.resendVerification(user.email)
        set({ isLoading: false })
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : 'Erro inesperado' })
      }
    },
    checkVerification: async () => {
      const accessToken = useAuthStore.getState().accessToken
      if (!accessToken) return
      set({ isLoading: true, error: null })
      try {
        const user = await authApi.me(accessToken)
        set({ user, isLoading: false })
      } catch (error) {
        set({ isLoading: false, error: error instanceof Error ? error.message : 'Erro inesperado' })
      }
    },
    continueWithoutVerificationForDevelopment: () => {
      if (__DEV__) set({ developmentVerificationBypass: true, error: null })
    },
    clearError: () => set({ error: null }),
  }
})
