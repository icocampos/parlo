/** Convert local file URLs to filesystem paths accepted by whisper.rn. */
export function nativeFilePath(uri: string): string {
  if (!uri.startsWith('file:')) return uri
  const path = uri.replace(/^file:\/{1,3}/, '/')
  try {
    return decodeURIComponent(path)
  } catch {
    throw new Error('O endereço do arquivo de áudio é inválido.')
  }
}

export function describeNativeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message) {
    const code = 'code' in error && (typeof error.code === 'number' || typeof error.code === 'string') ? ` (código ${error.code})` : ''
    return `${error.message}${code}`
  }
  return 'erro sem detalhes'
}
