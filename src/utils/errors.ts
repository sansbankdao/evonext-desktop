// src/utils/errors.ts

export interface ActionResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

export class ErrorBoundary {
    static async wrap<T>(
        fn: () => Promise<T>,
        errorCode: string
    ): Promise<ActionResponse<T>> {
        try {
            const data = await fn();
            if (data && typeof data === 'object' && 'success' in data) {
                return data as ActionResponse<T>;
            }
            return { success: true, data };
        } catch (error: any) {
            console.error(`[${errorCode}]:`, error);
            let message = 'An unexpected error occurred';
            if (typeof error === 'string') {
                message = error;
            } else if (error instanceof Error) {
                message = error.message;
            }
            return {
                success: false,
                error: message,
                code: errorCode
            };
        }
    }
}
