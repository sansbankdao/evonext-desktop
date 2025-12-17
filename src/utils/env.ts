// src/utils/env.ts
/**
 * Environment Configuration Utilities
 * Loads environment variables with fallbacks and validation.
 */

export class AppError extends Error {
    constructor(message: string, public code?: number) {
        super(message)
        this.name = 'AppError'
    }
}

// Development Configuration
export const DEV_HOST = import.meta.env.VITE_DEV_HOST || 'localhost'
export const DEV_PORT = import.meta.env.VITE_DEV_PORT || '1420'
export const HMR_PORT = import.meta.env.VITE_HMR_PORT || '1421'

// Network Configuration
export const DEFAULT_NETWORK = import.meta.env.VITE_DEFAULT_NETWORK || 'testnet'
export const MIN_CREDIT_TRANSFER = parseInt(
  import.meta.env.VITE_MIN_CREDIT_TRANSFER || '100000',
  10
)
export const DEFAULT_IDENTITY_SEARCH_LIMIT = parseInt(
  import.meta.env.VITE_DEFAULT_IDENTITY_SEARCH_LIMIT || '3',
  10
)

// API Endpoints
export const DASHSWAP_ENDPOINT = import.meta.env.VITE_DASHSWAP_ENDPOINT ||
  'https://dashswap.xyz/v1'
export const DAPI_WEB_API_ENDPOINT = import.meta.env.VITE_DAPI_WEB_API_ENDPOINT ||
  'https://dashqt.org/v1/dapi'
export const PLATFORM_HTTP_API_MAINNET = import.meta.env.VITE_PLATFORM_HTTP_API_MAINNET ||
  'https://platform-explorer.pshenmic.dev'
export const PLATFORM_HTTP_API_TESTNET = import.meta.env.VITE_PLATFORM_HTTP_API_TESTNET ||
  'https://testnet.platform-explorer.pshenmic.dev'

// Security/Performance Settings
export const DEFAULT_QUERY_REGISTRY = import.meta.env.VITE_DEFAULT_QUERY_REGISTRY === 'true'
export const DEFAULT_SECURITY_LEVEL = parseInt(
  import.meta.env.VITE_DEFAULT_SECURITY_LEVEL || '0',
  10
)
export const PRICE_UPDATE_INTERVAL_MS = parseInt(
  import.meta.env.VITE_PRICE_UPDATE_INTERVAL_MS || '30000',
  10
)
export const BALANCE_REFRESH_INTERVAL_MS = parseInt(
  import.meta.env.VITE_BALANCE_REFRESH_INTERVAL_MS || '60000',
  10
)

export const getDapiEndpoint = (): string => {
    return import.meta.env.VITE_DAPI_WEB_API_ENDPOINT || 'https://dashqt.org/v1/dapi'
}

// Feature Flags
export const ENABLE_PREMIUM_FEATURES = import.meta.env.VITE_ENABLE_PREMIUM_FEATURES !== 'false'
export const ENABLE_AUTO_UPDATE = import.meta.env.VITE_ENABLE_AUTO_UPDATE !== 'false'
export const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === 'true'

// Logging Configuration
export const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'info'
export const ENABLE_CONSOLE_LOGS = import.meta.env.VITE_ENABLE_CONSOLE_LOGS !== 'false'
export const ENABLE_FILE_LOGS = import.meta.env.VITE_ENABLE_FILE_LOGS === 'true'

// Validation
export function validateEnvironment() {
  const required = [
    'VITE_DEFAULT_NETWORK',
    'VITE_DASHSWAP_ENDPOINT',
    'VITE_PLATFORM_HTTP_API_MAINNET',
    'VITE_PLATFORM_HTTP_API_TESTNET'
  ]

  const missing = required.filter(key => !import.meta.env[key])

  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`)
    console.warn('Using default values. Some features may not work correctly.')
  }

  // Validate network
  if (!['testnet', 'mainnet'].includes(DEFAULT_NETWORK)) {
    throw new AppError(
      `Invalid DEFAULT_NETWORK: ${DEFAULT_NETWORK}. Must be 'testnet' or 'mainnet'.`,
      'ENV_VALIDATION_ERROR'
    )
  }

  // Validate intervals
  if (PRICE_UPDATE_INTERVAL_MS < 10000) {
    throw new AppError(
      `PRICE_UPDATE_INTERVAL_MS too low: ${PRICE_UPDATE_INTERVAL_MS}. Minimum is 10000ms.`,
      'ENV_VALIDATION_ERROR'
    )
  }

  if (BALANCE_REFRESH_INTERVAL_MS < 30000) {
    throw new AppError(
      `BALANCE_REFRESH_INTERVAL_MS too low: ${BALANCE_REFRESH_INTERVAL_MS}. Minimum is 30000ms.`,
      'ENV_VALIDATION_ERROR'
    )
  }
}

// Network-specific helpers
export function isTestnet(): boolean {
  return DEFAULT_NETWORK === 'testnet'
}

export function isMainnet(): boolean {
  return DEFAULT_NETWORK === 'mainnet'
}

export function getPlatformEndpoint(): string {
  return isTestnet() ? PLATFORM_HTTP_API_TESTNET : PLATFORM_HTTP_API_MAINNET
}

// Logging helper
export function log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]) {
  const levels = ['debug', 'info', 'warn', 'error']
  const currentLevelIndex = levels.indexOf(LOG_LEVEL)
  const messageLevelIndex = levels.indexOf(level)

  if (messageLevelIndex >= currentLevelIndex) {
    const logger = console[level] || console.log
    logger(`[${level.toUpperCase()}]`, ...args)
  }
}

// Initialize validation on import
try {
  validateEnvironment()
} catch (error) {
  console.error('Environment validation failed:', error)
  if (error instanceof AppError) {
    throw error
  }
}
