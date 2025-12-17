// src/utils/errors.ts

export class ErrorBoundary {
    static async wrap<T>(fn: () => Promise<T>, errorCode: string): Promise<T> {
        try {
            return await fn()
        } catch (error) {
            console.error(`[${errorCode}]:`, error)
            throw error
        }
    }
}

export class NetworkError extends Error {
    constructor(message: string, public code?: number) {
        super(message)
        this.name = 'NetworkError'
    }
}

export class AppError extends Error {
    constructor(message: string, public code?: number) {
        super(message)
        this.name = 'AppError'
    }
}
