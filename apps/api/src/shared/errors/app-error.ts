export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'APP_ERROR',
  ) {
    super(message)
    this.name = 'AppError'
  }
}
