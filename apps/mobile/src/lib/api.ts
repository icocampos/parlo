import type { AuthUser, LoginInput, RegisterInput, Session } from '@parlo/shared'

const apiUrl = process.env.EXPO_PUBLIC_API_URL

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!apiUrl) throw new Error('EXPO_PUBLIC_API_URL não está configurada')
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  const body = response.status === 204 ? undefined : await response.json()
  if (!response.ok) {
    const message = typeof body?.message === 'string' ? body.message : 'Não foi possível concluir a solicitação'
    throw new Error(message)
  }
  return body as T
}

export const authApi = {
  register: (input: RegisterInput) => request<Session>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: LoginInput) => request<Session>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  refresh: (refreshToken: string) => request<Session>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  resendVerification: (email: string) => request<{ message: string }>('/auth/resend-verification', {
    method: 'POST', body: JSON.stringify({ email }),
  }),
  me: (accessToken: string) => request<AuthUser>('/auth/me', {
    method: 'GET', headers: { Authorization: `Bearer ${accessToken}` },
  }),
}
