// src/stores/identity/actions/connection.ts

import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'

import type { IIdentityState } from '@/types'
import type { ConnectionResult } from '@/types'

export const connectionActions = () => ({
    async initFromStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState

            // Get current network from settings
            const network = await invoke('load_settings').then(settings => settings?.network || 'mainnet')
            log('info', 'Initializing from storage for network:', network)

            try {
                // Load data using network-specific files
                const [mnemonicData, keysData] = await Promise.all([
                    invoke('load_mnemonic', { network }),
                    invoke('load_private_keys', { network })
                ])
                log('info', 'Loaded from storage - mnemonic:', !!mnemonicData, 'keys:', !!keysData)

                // Load identity data
                const identityData = await invoke('load_identity_data', { network })
                state.isAuthenticated = identityData?.is_authenticated || false

                if (state.isAuthenticated && (mnemonicData || keysData)) {
                    log('info', 'Found stored identity and credentials, verifying state...')
                    await this.searchUserIdentities(network)
                } else if (!state.isAuthenticated && (mnemonicData || keysData)) {
                    log('info', 'Found stored credentials but no authenticated identity, re-authenticating...')
                    if (mnemonicData) {
                        await this.connectWithSeed((mnemonicData as any).seed_phrase, network)
                    } else if (keysData) {
                        const keys = keysData as any
                        await this.connectWithPrivateKeys(
                            keys.identity_id,
                            keys.auth_key,
                            keys.transfer_key,
                            keys.encryption_key,
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
                // Save mnemonic to network-specific file
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
                    state.connectionError = 'No identity found for the provided seed phrase.'
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
    async connectWithPrivateKeys(
        this: any,
        identityId: string,
        authKey: string,
        transferKey: string,
        encryptionKey: string,
        network: 'mainnet' | 'testnet' = 'mainnet',
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            state.isConnecting = true
            state.connectionError = null

            try {
                log('info', 'Attempting to connect with private keys on network:', network)
                // First, try to get identity from public key hash if needed
                let resolvedIdentityId = identityId.trim()
                // If input looks like a private key (WIF or HEX), extract public key and find identity
                if (!identityId.includes('.') && !identityId.includes(' ')) {
                    // This might be a key, not an identity ID
                    // We'll try to determine identity from the keys provided
                    if (authKey || transferKey || encryptionKey) {
                        const firstKey = authKey || transferKey || encryptionKey
                        // Extract public key hash from private key
                        const publicKeyHash = await this.derivePublicKeyHash(firstKey)
                        if (publicKeyHash) {
                            // Query DAPI to find identity
                            const identity = await this.findIdentityByPublicKeyHash(publicKeyHash, network)
                            if (identity) {
                                resolvedIdentityId = identity
                            }
                        }
                    }
                }
                const payload = {
                    identity_id: resolvedIdentityId,
                    auth_key: authKey.trim(),
                    transfer_key: transferKey.trim(),
                    encryption_key: encryptionKey.trim()
                }
                // Save to network-specific file
                await invoke('save_private_keys', { network, payload })
                state.username = resolvedIdentityId
                state.isAuthenticated = true
                const identity = await this.searchUserIdentities(network)
                if (identity) {
                    state.identity = identity
                }
                log('info', 'Private keys connection successful. isAuthenticated:', state.isAuthenticated)
                await this.saveToStorage()
                return { success: true, identity: state.identity || undefined }
            } catch (err: any) {
                log('error', 'Private keys connection failed:', err)
                state.connectionError = typeof err === 'string' ? err : 'Failed to connect with private keys.'
                return { success: false, error: state.connectionError }
            } finally {
                state.isConnecting = false
            }
        }, 'CONNECT_WITH_PRIVATE_KEYS_FAILED')
    },
    async derivePublicKeyHash(this: any, privateKey: string): Promise<string | null> {
        // TODO: Implement private key to public key hash conversion
        // This would use @evonext/crypto or similar library
        return null
    },
    async findIdentityByPublicKeyHash(this: any, publicKeyHash: string, network: string): Promise<string | null> {
        try {
            const result = await invoke('get_identity_by_public_key_hash', {
                params: [publicKeyHash],
                network
            })
            if (result?.success && result?.identityId) {
                return result.identityId
            }
            // Try non-unique lookup as fallback
            const result2 = await invoke('get_identity_by_non_unique_public_key_hash', {
                params: [publicKeyHash],
                network
            })
            if (result2?.success && result2?.identityId) {
                return result2.identityId
            }
            return null
        } catch (error) {
            console.error('Failed to find identity by public key hash:', error)
            return null
        }
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

            // Reset all state
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
