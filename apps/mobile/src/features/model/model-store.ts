import { Directory, File, Paths } from 'expo-file-system'
import { Platform } from 'react-native'
import { create } from 'zustand'
import { DEFAULT_MODEL } from './model-catalog'

type ModelStatus = 'checking' | 'missing' | 'downloading' | 'ready' | 'error' | 'unavailable'

type ModelState = {
  status: ModelStatus
  progress: number
  modelUri: string | null
  error: string | null
  check(): Promise<void>
  download(): Promise<void>
}

export const useModelStore = create<ModelState>((set) => ({
  status: 'checking',
  progress: 0,
  modelUri: null,
  error: null,
  check: async () => {
    if (Platform.OS === 'web') {
      set({ status: 'unavailable', modelUri: null })
      return
    }
    const { modelFile } = modelStorage()
    set(modelFile.exists
      ? { status: 'ready', modelUri: modelFile.uri, progress: 1 }
      : { status: 'missing', modelUri: null, progress: 0 })
  },
  download: async () => {
    try {
      if (Platform.OS === 'web') {
        set({ status: 'unavailable', modelUri: null, error: null })
        return
      }
      const { modelsDirectory, modelFile } = modelStorage()
      set({ status: 'downloading', progress: 0, error: null })
      modelsDirectory.create({ idempotent: true, intermediates: true })
      const task = File.createDownloadTask(DEFAULT_MODEL.url, modelFile, {
        onProgress: ({ bytesWritten, totalBytes }) => {
          if (totalBytes > 0) set({ progress: Math.min(bytesWritten / totalBytes, 1) })
        },
      })
      const file = await task.downloadAsync()
      if (!file) throw new Error('Download interrompido')
      set({ status: 'ready', modelUri: file.uri, progress: 1 })
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Falha no download' })
    }
  },
}))

function modelStorage() {
  const modelsDirectory = new Directory(Paths.document, 'models')
  return {
    modelsDirectory,
    modelFile: new File(modelsDirectory, DEFAULT_MODEL.filename),
  }
}
