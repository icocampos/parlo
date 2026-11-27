import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const REFRESH_TOKEN_KEY = 'parlo.refresh-token'

export const sessionStorage = {
  getRefreshToken: () => Platform.OS === 'web'
    ? AsyncStorage.getItem(REFRESH_TOKEN_KEY)
    : SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => Platform.OS === 'web'
    ? AsyncStorage.setItem(REFRESH_TOKEN_KEY, token)
    : SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clear: () => Platform.OS === 'web'
    ? AsyncStorage.removeItem(REFRESH_TOKEN_KEY)
    : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
}
