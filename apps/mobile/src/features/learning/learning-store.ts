import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import type { LearningLevel, LearningProfile, NativeLanguage, TargetLanguage } from './learning-profile'

const STORAGE_KEY = 'parlo.learning-profile'

type LearningState = {
  profile: LearningProfile | null
  hydrated: boolean
  hydrate(): Promise<void>
  save(nativeLanguage: NativeLanguage, targetLanguage: TargetLanguage, level: LearningLevel): Promise<void>
}

export const useLearningStore = create<LearningState>((set) => ({
  profile: null,
  hydrated: false,
  hydrate: async () => {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    set({ profile: value ? JSON.parse(value) as LearningProfile : null, hydrated: true })
  },
  save: async (nativeLanguage, targetLanguage, level) => {
    const profile: LearningProfile = { nativeLanguage, targetLanguage, level }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    set({ profile })
  },
}))
