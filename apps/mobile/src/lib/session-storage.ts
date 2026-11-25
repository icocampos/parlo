import * as SecureStore from 'expo-secure-store'

const REFRESH_TOKEN_KEY = 'parlo.refresh-token'

export const sessionStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
}
