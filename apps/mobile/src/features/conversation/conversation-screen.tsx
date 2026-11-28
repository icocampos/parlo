import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from 'expo-audio'
import { File } from 'expo-file-system'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { LearningProfile } from '../learning/learning-profile'
import { languageName } from '../learning/learning-profile'
import { useConversationStore, type ConversationPhase } from './conversation-store'

type ConversationScreenProps = {
  profile: LearningProfile
  modelUri: string | null
  speechModelUri: string | null
  onBack: () => void
}

export function ConversationScreen({ profile, modelUri, speechModelUri, onBack }: ConversationScreenProps) {
  const [microphoneLevel, setMicrophoneLevel] = useState(0)
  const lastMeterUpdate = useRef(0)
  const { stream, isStreaming } = useAudioStream({ sampleRate: 16_000, channels: 1, encoding: 'int16', onBuffer: (buffer) => {
    const now = Date.now()
    if (now - lastMeterUpdate.current < 200) return
    lastMeterUpdate.current = now
    const samples = new Int16Array(buffer.data)
    let peak = 0
    for (let index = 0; index < samples.length; index += 1) peak = Math.max(peak, Math.abs(samples[index] ?? 0))
    setMicrophoneLevel(Math.min(peak / 6000, 1))
  } })
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const recording = useRef(false)
  const stopping = useRef(false)
  const starting = useRef(false)
  const screenActive = useRef(true)
  const greetingPlayed = useRef(false)
  const {
    messages,
    phase,
    error,
    start,
    beginListening,
    processRecording,
    processDemoTurn,
    replayLastTutor,
    replayCorrection,
    reportError,
    stopSpeaking,
    cancelActiveTurn,
  } = useConversationStore()

  const demoMode = Platform.OS === 'web' || !modelUri || !speechModelUri
  const latestTutor = [...messages].reverse().find((message) => message.role === 'tutor')
  const hasCorrection = Boolean(latestTutor?.feedback?.corrected)

  useEffect(() => {
    const created = start(profile)
    if (!created && useConversationStore.getState().messages.length > 1) return
    const timer = setTimeout(() => {
      if (greetingPlayed.current) return
      greetingPlayed.current = true
      void replayLastTutor(profile)
    }, 450)
    return () => clearTimeout(timer)
  }, [profile, replayLastTutor, start])

  useEffect(() => {
    if (phase !== 'listening') {
      setRecordingSeconds(0)
      return
    }
    const timer = setInterval(() => setRecordingSeconds((value) => value + 1), 1_000)
    return () => clearInterval(timer)
  }, [phase])

  useEffect(() => {
    screenActive.current = true
    return () => {
      screenActive.current = false
      starting.current = false
      if (recording.current) stream.stop()
      recording.current = false
      void restorePlaybackAudioMode()
      void cancelActiveTurn()
    }
  }, [cancelActiveTurn, stream])

  const startRecording = async () => {
    if ((phase !== 'idle' && phase !== 'error') || starting.current) return
    starting.current = true

    try {
      if (demoMode) {
        await beginListening()
        return
      }

      const permission = await requestRecordingPermissionsAsync()
      if (!permission.granted) {
        reportError('Permita o acesso ao microfone para conversar com o tutor.')
        return
      }
      if (!screenActive.current) return

      await stopSpeaking()
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix' })
      await stream.start()
      if (!screenActive.current) {
        stream.stop()
        await restorePlaybackAudioMode()
        return
      }
      await stream.startFileRecordingAsync({ format: 'wav', directory: 'cache' })
      recording.current = true
      await beginListening()
    } catch {
      stream.stop()
      recording.current = false
      await restorePlaybackAudioMode()
      if (screenActive.current) reportError('Não foi possível iniciar o microfone. Verifique a permissão e tente novamente.')
    } finally {
      starting.current = false
    }
  }

  const finishRecording = async () => {
    if (phase !== 'listening' || stopping.current) return
    stopping.current = true
    if (demoMode) {
      try {
        await processDemoTurn(profile)
      } finally {
        stopping.current = false
      }
      return
    }

    try {
      const result = await stream.stopFileRecordingAsync()
      stream.stop()
      recording.current = false
      await restorePlaybackAudioMode()
      if (!screenActive.current) {
        deleteRecording(result.uri)
        return
      }
      if (result.duration < 0.7) {
        deleteRecording(result.uri)
        reportError('Fale por pelo menos um segundo antes de enviar.')
        return
      }
      stopping.current = false
      await processRecording(result.uri, profile, modelUri!, speechModelUri!)
    } catch {
      stream.stop()
      recording.current = false
      await restorePlaybackAudioMode()
      if (screenActive.current) reportError('A gravação foi interrompida. Toque no microfone para tentar novamente.')
    } finally {
      stopping.current = false
    }
  }

  useEffect(() => {
    if (phase === 'listening' && recordingSeconds >= 30) void finishRecording()
  }, [phase, recordingSeconds])

  useEffect(() => {
    if (phase !== 'listening' || demoMode || isStreaming) return
    const timer = setTimeout(() => {
      if (!screenActive.current || !recording.current || stream.isStreaming) return
      recording.current = false
      void restorePlaybackAudioMode()
      reportError('O microfone foi interrompido pelo sistema. Toque para tentar novamente.')
    }, 750)
    return () => clearTimeout(timer)
  }, [demoMode, isStreaming, phase, reportError, stream])

  const leaveConversation = async () => {
    screenActive.current = false
    starting.current = false
    if (recording.current) {
      stream.stop()
      recording.current = false
    }
    await restorePlaybackAudioMode()
    await cancelActiveTurn()
    onBack()
  }

  const toggleRecording = () => {
    if (phase === 'listening') void finishRecording()
    else void startRecording()
  }

  const phaseCopy = copyForPhase(phase, recordingSeconds, demoMode)
  const busy = phase === 'transcribing' || phase === 'thinking' || phase === 'speaking'
  const micEnabled = phase === 'idle' || phase === 'error' || phase === 'listening'

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-row items-center border-b border-ink/10 px-5 py-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" className="h-11 w-11 items-center justify-center rounded-full bg-white" onPress={() => void leaveConversation()}>
          <Text className="text-2xl text-ink">‹</Text>
        </Pressable>
        <View className="ml-3 flex-1">
          <Text className="text-xs font-semibold uppercase tracking-widest text-sage">Conversa por voz</Text>
          <Text className="mt-0.5 text-lg font-bold text-ink">Tutor de {languageName(profile.targetLanguage)}</Text>
        </View>
        <View className={`rounded-full px-3 py-1.5 ${demoMode ? 'bg-coral/10' : 'bg-sage/10'}`}>
          <Text className={`text-xs font-semibold ${demoMode ? 'text-coral' : 'text-sage'}`}>{demoMode ? 'Demo' : 'Local'}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="grow px-5 pb-6 pt-5" showsVerticalScrollIndicator={false}>
        {demoMode && (
          <View className="mb-5 rounded-2xl border border-coral/20 bg-coral/10 px-4 py-3">
            <Text className="text-sm leading-5 text-ink/70">
              Demonstração: a interface e a voz do tutor funcionam, mas sua fala será simulada até os modelos locais serem baixados.
            </Text>
          </View>
        )}

        <View className="items-center py-3">
          <VoiceOrb phase={phase} />
          <Text className="mt-6 text-center text-2xl font-bold text-ink">{phaseCopy.title}</Text>
          <Text className="mt-2 max-w-sm text-center text-sm leading-5 text-ink/55">{phaseCopy.subtitle}</Text>
          {phase === 'listening' && !demoMode && <View className="mt-4 w-40"><View className="h-2 overflow-hidden rounded-full bg-ink/10"><View className="h-2 rounded-full bg-sage" style={{ width: `${Math.round(microphoneLevel * 100)}%` }} /></View><Text className="mt-2 text-center text-xs text-ink/50">Nível do microfone</Text></View>}
          {busy && <ActivityIndicator className="mt-4" color="#5B8E7D" />}
        </View>

        <View className="mt-5 gap-3">
          {hasCorrection && latestTutor?.feedback && (
            <View className="rounded-3xl border border-coral/20 bg-white px-5 py-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-xs font-semibold uppercase tracking-wider text-coral">Uma forma mais natural</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Ouvir a forma corrigida" disabled={phase !== 'idle'} onPress={() => void replayCorrection(profile)}>
                  <Text className={`text-sm font-semibold ${phase === 'idle' ? 'text-coral' : 'text-ink/25'}`}>Ouvir correção</Text>
                </Pressable>
              </View>
              {latestTutor.feedback.original && <Text className="mt-2 text-sm text-ink/45 line-through">{latestTutor.feedback.original}</Text>}
              <Text className="mt-1 text-lg font-bold text-ink">{latestTutor.feedback.corrected}</Text>
              {latestTutor.feedback.explanationPtBr && <Text className="mt-2 text-sm leading-5 text-ink/60">{latestTutor.feedback.explanationPtBr}</Text>}
            </View>
          )}

          {latestTutor && (
            <View className="rounded-3xl bg-white px-5 py-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-xs font-semibold uppercase tracking-wider text-sage">Parlo respondeu</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Ouvir resposta novamente" disabled={phase !== 'idle'} onPress={() => void replayLastTutor(profile)}>
                  <Text className={`text-sm font-semibold ${phase === 'idle' ? 'text-sage' : 'text-ink/25'}`}>Ouvir novamente</Text>
                </Pressable>
              </View>
            </View>
          )}

          {error && <Text className="px-2 text-center text-sm leading-5 text-coral">{error}</Text>}
        </View>
      </ScrollView>

      <View className="items-center border-t border-ink/10 bg-white px-5 pb-5 pt-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={phase === 'listening' ? 'Parar gravação' : 'Começar a falar'}
          className={`h-20 w-20 items-center justify-center rounded-full ${phase === 'listening' ? 'bg-coral' : 'bg-ink'} disabled:opacity-30`}
          disabled={!micEnabled}
          onPress={toggleRecording}
        >
          <Text className="text-3xl text-white">{phase === 'listening' ? '■' : '●'}</Text>
        </Pressable>
        <Text className="mt-3 text-sm font-semibold text-ink">{phase === 'listening' ? 'Toque para enviar' : busy ? 'Aguarde um instante' : 'Toque para falar'}</Text>
        {phase === 'speaking' && (
          <Pressable className="mt-2 py-1" onPress={() => void stopSpeaking()}>
            <Text className="text-sm font-semibold text-coral">Interromper voz</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  )
}

function VoiceOrb({ phase }: { phase: ConversationPhase }) {
  const active = phase === 'listening' || phase === 'speaking'
  return (
    <View className={`h-40 w-40 items-center justify-center rounded-full ${active ? 'bg-coral/15' : 'bg-sage/10'}`}>
      <View className={`h-28 w-28 items-center justify-center rounded-full ${active ? 'bg-coral' : 'bg-sage'}`}>
        {phase === 'listening' ? (
          <View className="h-10 flex-row items-center gap-1.5">
            {[18, 34, 26, 40, 22].map((height, index) => <View key={index} className="w-1.5 rounded-full bg-white" style={{ height }} />)}
          </View>
        ) : <Text className="text-4xl text-white">{phase === 'speaking' ? ')))' : 'P'}</Text>}
      </View>
    </View>
  )
}

function copyForPhase(phase: ConversationPhase, seconds: number, demoMode: boolean) {
  const copies = {
    idle: { title: 'Sua vez de falar', subtitle: 'Fale naturalmente. O tutor vai responder e corrigir apenas o que for mais importante.' },
    listening: { title: `Estou ouvindo · ${formatDuration(seconds)}`, subtitle: demoMode ? 'Fale para experimentar e toque novamente para continuar a demonstração.' : 'Quando terminar, toque novamente no botão.' },
    transcribing: { title: 'Entendendo sua fala', subtitle: 'O Whisper está transcrevendo o áudio no seu aparelho.' },
    thinking: { title: 'Preparando uma resposta', subtitle: 'O tutor local está analisando o que você disse.' },
    speaking: { title: 'Ouça e responda', subtitle: 'Preste atenção na forma natural de falar e continue a conversa.' },
    error: { title: 'Vamos tentar novamente', subtitle: 'Toque no microfone e fale uma frase curta, perto do aparelho.' },
  }
  return copies[phase]
}

function formatDuration(seconds: number) {
  return `0:${seconds.toString().padStart(2, '0')}`
}

async function restorePlaybackAudioMode() {
  try {
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
  } catch {
    // A sessão já pode ter sido liberada pelo sistema durante uma interrupção.
  }
}

function deleteRecording(uri: string) {
  try {
    const file = new File(uri)
    if (file.exists) file.delete()
  } catch {
    // Arquivos na pasta de cache também são limpos pelo sistema.
  }
}
