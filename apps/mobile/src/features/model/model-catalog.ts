export const DEFAULT_MODEL = {
  id: 'qwen2.5-0.5b-instruct-q4-k-m',
  name: 'Qwen 2.5 0.5B',
  filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
  sizeLabel: '491 MB',
  sizeBytes: 491_000_000,
  url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  license: 'Apache-2.0',
} as const

export const SPEECH_MODEL = {
  id: 'whisper-base-q5-1',
  name: 'Whisper Base multilíngue',
  filename: 'ggml-base-q5_1.bin',
  sizeLabel: '57 MB',
  sizeBytes: 59_707_625,
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin?download=true',
  license: 'MIT',
} as const
