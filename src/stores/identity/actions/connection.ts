// src/stores/identity/actions/connection.ts

import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import type { IIdentityState } from '@/types'
import type { ConnectionResult } from '@/types'
import type { TauriCommandResponse } from '@/types/lib.types'

interface Settings {
    network: 'mainnet' | 'testnet'
    [key: string]: any
}

interface MnemonicData {
    seed_phrase: string
}

interface PrivateKeysData {
    identity_id: string
    auth_key: string
    transfer_key: string
    encryption_key: string
}

interface IdentityData {
    identity_id: string
    is_authenticated: boolean
    [key: string]: any
}

// Helper to load data safely
const loadStorageData = async <T>(command: string, network: string): Promise<T | null> => {
    try {
        return await invoke<T | null>(command, { network })
    } catch {
        return null
    }
}

export const connectionActions = () => ({
    async initFromStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState

            const settings = await invoke<Settings>('load_settings')
            const network = settings?.network || 'mainnet'
            log('info', 'Initializing from storage for network:', network)

            try {
                const [mnemonicData, keysData] = await Promise.all([
                    loadStorageData<MnemonicData>('load_mnemonic', network),
                    loadStorageData<PrivateKeysData>('load_private_keys', network)
                ])

                log('info', 'Loaded from storage - mnemonic:', !!mnemonicData, 'keys:', !!keysData)

                const identityData = await loadStorageData<IdentityData>('load_identity_data', network)
                state.isAuthenticated = identityData?.is_authenticated || false

                if (state.isAuthenticated && (mnemonicData || keysData)) {
                    log('info', 'Found stored identity and credentials, verifying state...')
                    await this.searchUserIdentities(network)
                } else if (!state.isAuthenticated && (mnemonicData || keysData)) {
                    log('info', 'Found stored credentials but no authenticated identity, re-authenticating...')
                    if (mnemonicData) {
                        await this.connectWithSeed(mnemonicData.seed_phrase, network)
                    } else if (keysData) {
                        await this.connectWithPrivateKeys(
                            keysData.identity_id,
                            keysData.auth_key,
                            keysData.transfer_key,
                            keysData.encryption_key,
                            network
                        )
                    }
                }
            } catch (err) {
                log('error', 'Failed to initialize identity from storage:', err)
                throw err
            }
        }, 'INIT_FROM_STORAGE_FAILED')
    },

    async connectWithSeed(
        this: any,
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'mainnet'
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            state.isConnecting = true
            state.connectionError = null

            try {
                log('info', 'Attempting to connect with seed phrase on network:', network)

                await invoke('save_mnemonic', {
                    network,
                    payload: { seed_phrase: seedPhrase }
                })

                const identity = await this.searchUserIdentities(network)
                    .catch((err: Error) => {
                        log('error', 'Failed to search for identities:', err)
                        throw err
                    })

                if (identity) {
                    state.isAuthenticated = true
                    log('info', 'Seed connection successful. isAuthenticated:', state.isAuthenticated)
                    await this.saveToStorage()
                    return { success: true, identity }
                } else {
                    state.connectionError = 'No identity found for provided seed phrase.'
                    return { success: false, error: state.connectionError }
                }
            } catch (err: any) {
                log('error', 'Seed connection failed:', err)
                state.connectionError = typeof err === 'string' ? err : 'Failed to connect with seed phrase.'
                return { success: false, error: state.connectionError }
            } finally {
                state.isConnecting = false
            }
        }, 'CONNECT_WITH_SEED_FAILED')
    },

    async connectWithSingleKey(
        this: any,
        privateKey: string,
        identityId: string,
        network: 'mainnet' | 'testnet' = 'mainnet'
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            state.isConnecting = true
            state.connectionError = null

            try {
                log('info', 'Attempting to connect with single key on network:', network)

                // If no identityId provided (user entered raw key), discover it
                let resolvedIdentityId = identityId.trim()
                if (!resolvedIdentityId) {
                    // Use the IdentityDiscoveryService pattern directly here if we wanted,
                    // but we can also use the backend helper if available.
                    // For now, we assume the UI has already run discovery if identityId is missing.
                    // However, to support direct key entry, we'll attempt a lookup here.
                    const lookupResult = await this.lookupIdentityByKey(privateKey, network)
                    if (lookupResult) {
                        resolvedIdentityId = lookupResult
                    } else {
                        throw new Error('Could not resolve identity from the provided key.')
                    }
                }

                // We save the single key. The backend/wallet logic will need to handle
                // re-deriving or using this specific key for operations.
                // To maintain compatibility with 'save_private_keys' which expects all three,
                // we repeat the key. The backend should prefer the valid one.
                const payload = {
                    identity_id: resolvedIdentityId,
                    auth_key: privateKey,
                    transfer_key: privateKey,
                    encryption_key: privateKey
                }

                await invoke('save_private_keys', { network, payload })

                state.username = resolvedIdentityId
                state.isAuthenticated = true

                const identity = await this.searchUserIdentities(network)
                if (identity) {
                    state.identity = identity
                }

                log('info', 'Single key connection successful. isAuthenticated:', state.isAuthenticated)
                await this.saveToStorage()
                return { success: true, identity: state.identity || undefined }
            } catch (err: any) {
                log('error', 'Single key connection failed:', err)
                state.connectionError = typeof err === 'string' ? err : 'Failed to connect with private key.'
                return { success: false, error: state.connectionError }
            } finally {
                state.isConnecting = false
            }
        }, 'CONNECT_WITH_SINGLE_KEY_FAILED')
    },

    async lookupIdentityByKey(
        this: any,
        privateKey: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string | null> {
        try {
            // This method relies on the backend having a helper to convert key -> hash -> identity
            // or we invoke the discovery service logic.
            // Assuming a helper `find_identity_by_private_key` exists or we wrap existing commands.

            // Note: The IdentityDiscoveryService runs in frontend.
            // If we want the store to do it, we need the crypto logic here.
            // For now, we rely on the UI to provide the IdentityId via discovery.

            // If we really need to do it here:
            // 1. Derive PubKeyHash (requires crypto lib)
            // 2. Invoke get_identity_by_public_key_hash

            // Placeholder for now:
            log('warn', 'Direct lookup from store requires crypto implementation. Using UI discovery flow.')
            return null
        } catch (error) {
            log('error', 'Failed to lookup identity by key:', error)
            return null
        }
    },

    async connectWithPrivateKeys(
        this: any,
        identityId: string,
        authKey: string,
        transferKey: string,
        encryptionKey: string,
        network: 'mainnet' | 'testnet' = 'mainnet',
    ): Promise<ConnectionResult> {
        // Legacy wrapper: just calls connectWithSingleKey using the first available key
        const key = authKey || transferKey || encryptionKey
        return this.connectWithSingleKey(key, identityId, network)
    },

    login(this: any, username: string) {
        const state = this as IIdentityState
        state.username = username
        state.isAuthenticated = true
        this.saveToStorage()
    },

    async logout(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            try {
                await this.clearStorage()
            } catch (err) {
                log('error', 'Error clearing storage during logout:', err)
            }

            state.username = null
            state.identity = null
            state.balance = null
            state.publicKeys = []
            state.revision = null
            state.isAuthenticated = false
            state.premiumAccess = false
            state.connectionError = null
            state.lastConnected = null
            log('info', 'User logged out successfully')
        }, 'LOGOUT_FAILED')
    },

    setPremiumAccess(this: any, hasAccess: boolean) {
        const state = this as IIdentityState
        state.premiumAccess = hasAccess
        this.saveToStorage()
    },

    clearConnectionError(this: any) {
        const state = this as IIdentityState
        state.connectionError = null
    },
})
