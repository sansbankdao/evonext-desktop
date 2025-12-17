// src/utils/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }

  static fromUnknown(error: unknown, code = 'UNKNOWN_ERROR'): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      return new AppError(error.message, code, error)
    }

    return new AppError(String(error), code, error)
  }
}

export class StoreError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'STORE_ERROR', originalError)
    this.name = 'StoreError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NETWORK_ERROR', originalError)
    this.name = 'NetworkError'
  }
}

export class IdentityError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'IDENTITY_ERROR', originalError)
    this.name = 'IdentityError'
  }
}

// Error boundary utility
export class ErrorBoundary {
  private static errorHandlers: Map<string, (error: AppError) => void> = new Map()

  static registerHandler(handlerId: string, handler: (error: AppError) => void) {
    this.errorHandlers.set(handlerId, handler)
  }

  static async wrap<T>(
    operation: () => Promise<T>,
    errorCode: string = 'OPERATION_FAILED'
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const appError = AppError.fromUnknown(error, errorCode)

      // Log error
      console.error(`[${errorCode}]`, appError.message, appError.originalError)

      // Notify handlers
      this.errorHandlers.forEach(handler => handler(appError))

      throw appError
    }
  }
}
