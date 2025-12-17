// src/stores/identity/actions/connection.ts
import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { StoreManager } from '@/utils/store'
import getNetwork from '@/libs/getNetwork'
import type { IIdentityState } from '@/types'
import type { ConnectionResult } from '../types'
export const connectionActions = () => ({
    async initFromStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const network = await getNetwork()
            try {
                await this.loadFromStorage()
                const [mnemonicData, keysData] = await Promise.all([
                    StoreManager.load('mnemonic'),
                    StoreManager.load('keys', 'keys')
                ])
                log('info', 'Loaded from storage - identity:', state.isAuthenticated, 'mnemonic:', !!mnemonicData, 'keys:', !!keysData)
                if (state.isAuthenticated && (mnemonicData || keysData)) {
                    log('info', 'Found stored identity and credentials, verifying state...')
                    await this.searchUserIdentities(network)
                } else if (!state.isAuthenticated && (mnemonicData || keysData)) {
                    log('info', 'Found stored credentials but no identity, re-authenticating...')
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
                log('info', 'Attempting to connect with a mnemonic.')
                const payload = { seed_phrase: seedPhrase }
                await StoreManager.save('mnemonic', payload)
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
                log('info', 'Attempting to connect with private keys.')
                const payload = {
                    identity_id: identityId.trim(),
                    auth_key: authKey.trim(),
                    transfer_key: transferKey.trim(),
                    encryption_key: encryptionKey.trim()
                }
                await StoreManager.save('keys', 'keys', payload)
                const resolvedIdentityId = identityId.trim()
                state.username = resolvedIdentityId
                state.isAuthenticated = true
                const identity = await this.searchUserIdentities(network)
                if (identity) {
                    state.identity = identity
                }
                log('info', 'Private keys connection successful. isAuthenticated:', state.isAuthenticated)
                await this.saveToStorage()
                return { success: true, identity: state.identity }
            } catch (err: any) {
                log('error', 'Private keys connection failed:', err)
                state.connectionError = typeof err === 'string' ? err : 'Failed to connect with private keys.'
                return { success: false, error: state.connectionError }
            } finally {
                state.isConnecting = false
            }
        }, 'CONNECT_WITH_PRIVATE_KEYS_FAILED')
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
                // Continue with state reset even if storage fails
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
