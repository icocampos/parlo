import { Directory, File, Paths } from 'expo-file-system'
import { NativeEventEmitter, NativeModules, Platform } from 'react-native'
import { create } from 'zustand'
import { DEFAULT_MODEL, SPEECH_MODEL } from './model-catalog'

type ModelStatus = 'checking' | 'missing' | 'downloading' | 'ready' | 'error' | 'unavailable'

type ModelState = {
  status: ModelStatus
  progress: number
  speechProgress: number
  preparationStage: string
  modelUri: string | null
  speechModelUri: string | null
  error: string | null
  check(): Promise<void>
  download(): Promise<void>
}

export const useModelStore = create<ModelState>((set) => ({
  status: 'checking',
  progress: 0,
  speechProgress: 0,
  preparationStage: 'Verificando recursos',
  modelUri: null,
  speechModelUri: null,
  error: null,
  check: async () => {
    if (Platform.OS === 'web') {
      set({ status: 'unavailable', modelUri: null, speechModelUri: null })
      return
    }
    if (Platform.OS === 'android') {
      set({ status: 'downloading', error: null, progress: 0, preparationStage: 'Verificando recursos' })
      let subscription: { remove(): void } | undefined
      try {
        if (!NativeModules.BundledModels) throw new Error('Esta versão não contém os modelos integrados. Instale o novo APK.')
        const emitter = new NativeEventEmitter(NativeModules.BundledModels)
        subscription = emitter.addListener('BundledModelsProgress', (value) => {
          const event = value as { bytes: number; total: number; stage: string }
          set({ progress: event.total > 0 ? Math.min(event.bytes / event.total, 1) : 0, preparationStage: event.stage })
        })
        const result = await NativeModules.BundledModels.prepare() as { modelUri: string; speechModelUri: string }
        set({ status: 'ready', ...result, progress: 1, speechProgress: 1 })
      } catch (error) {
        set({ status: 'error', error: error instanceof Error ? error.message : 'Não foi possível preparar os recursos.' })
      } finally {
        subscription?.remove()
      }
      return
    }
    const { modelFile, speechModelFile } = modelStorage()
    const modelUri = isComplete(modelFile, DEFAULT_MODEL.sizeBytes) ? modelFile.uri : null
    const speechModelUri = isComplete(speechModelFile, SPEECH_MODEL.sizeBytes) ? speechModelFile.uri : null
    set({
      status: modelUri && speechModelUri ? 'ready' : 'missing',
      modelUri,
      speechModelUri,
      progress: modelUri ? 1 : 0,
      speechProgress: speechModelUri ? 1 : 0,
      error: null,
    })
  },
  download: async () => {
    try {
      if (Platform.OS === 'android') {
        await useModelStore.getState().check()
        return
      }
      if (Platform.OS === 'web') {
        set({ status: 'unavailable', modelUri: null, speechModelUri: null, error: null })
        return
      }
      const { modelsDirectory, modelFile, speechModelFile } = modelStorage()
      set({ status: 'downloading', error: null })
      modelsDirectory.create({ idempotent: true, intermediates: true })

      let modelUri = isComplete(modelFile, DEFAULT_MODEL.sizeBytes) ? modelFile.uri : null
      if (!modelUri) {
        deletePartialFile(modelFile)
        const task = File.createDownloadTask(DEFAULT_MODEL.url, modelFile, {
          onProgress: ({ bytesWritten, totalBytes }) => {
            if (totalBytes > 0) set({ progress: Math.min(bytesWritten / totalBytes, 1) })
          },
        })
        const file = await task.downloadAsync()
        if (!file || !isComplete(file, DEFAULT_MODEL.sizeBytes)) throw new Error('Download do tutor interrompido')
        modelUri = file.uri
        set({ modelUri, progress: 1 })
      }

      let speechModelUri = isComplete(speechModelFile, SPEECH_MODEL.sizeBytes) ? speechModelFile.uri : null
      if (!speechModelUri) {
        deletePartialFile(speechModelFile)
        const task = File.createDownloadTask(SPEECH_MODEL.url, speechModelFile, {
          onProgress: ({ bytesWritten, totalBytes }) => {
            if (totalBytes > 0) set({ speechProgress: Math.min(bytesWritten / totalBytes, 1) })
          },
        })
        const file = await task.downloadAsync()
        if (!file || !isComplete(file, SPEECH_MODEL.sizeBytes)) throw new Error('Download do reconhecimento de voz interrompido')
        speechModelUri = file.uri
      }

      set({ status: 'ready', modelUri, speechModelUri, progress: 1, speechProgress: 1 })
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
    speechModelFile: new File(modelsDirectory, SPEECH_MODEL.filename),
  }
}

function isComplete(file: File, expectedSize: number) {
  return file.exists && (file.size ?? 0) >= expectedSize * 0.95
}

function deletePartialFile(file: File) {
  if (file.exists) file.delete()
}
