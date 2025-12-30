// src/stores/identity/actions/connection.ts
import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import type { IIdentityState, ConnectionResult } from '@/types'
interface Settings {
    network: 'mainnet' | 'testnet'
    [key: string]: any
}
const loadStorageData = async <T>(command: string, network: string): Promise<T | null> => {
    try {
        return await invoke<T | null>(command, { network })
    } catch (err) {
        log('error', `Failed to load storage data for ${command}:`, err)
        return null
    }
}
export const connectionActions = () => ({
    async initFromStorage(this: IIdentityState) {
        return ErrorBoundary.wrap(async () => {
            try {
                const settings = await invoke<Settings>('load_settings')
                const network = settings?.network || 'mainnet'
                log('info', 'Initializing from storage for network:', network)
                const [mnemonicData, keysData] = await Promise.all([
                    loadStorageData<{ seed_phrase: string }>('load_mnemonic', network),
                    loadStorageData<{ identity_id: string; auth_key: string; transfer_key: string; encryption_key: string }>('load_private_keys', network)
                ])
                log('info', 'Loaded from storage - mnemonic:', !!mnemonicData, 'keys:', !!keysData)
                const identityData = await loadStorageData<{ identity_id: string; is_authenticated: boolean }>('load_identity_data', network)
                this.isAuthenticated = identityData?.is_authenticated || false
                if (this.isAuthenticated && (mnemonicData || keysData)) {
                    log('info', 'Found stored identity and credentials, verifying state...')
                    await this.searchUserIdentities(network)
                } else if (!this.isAuthenticated && (mnemonicData || keysData)) {
                    log('info', 'Found stored credentials but no authenticated identity, re-authenticating...')
                    if (mnemonicData) {
                        await this.connectWithSeed(mnemonicData.seed_phrase, network)
                    } else if (keysData) {
                        await this.connectWithSingleKey(
                            keysData.auth_key, // Use auth_key as the primary key
                            keysData.identity_id,
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
        this: IIdentityState,
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'mainnet'
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null
            try {
                log('info', 'Attempting to connect with seed phrase on network:', network)
                // Save mnemonic for this network
                await invoke('save_mnemonic', {
                    network,
                    payload: { seed_phrase: seedPhrase }
                })
                // Use the IdentityManager to find all identities from this seed
                const identities = await this.searchUserIdentities(network)
                if (identities && identities.length > 0) {
                    this.isAuthenticated = true
                    // Store the first identity found
                    this.identity = identities[0]
                    log('info', `Seed connection successful. Found ${identities.length} identities`)
                    await this.saveToStorage()
                    return { success: true, identity: this.identity }
                } else {
                    this.connectionError = 'No identities found for the provided seed phrase on this network.'
                    return { success: false, error: this.connectionError }
                }
            } catch (err: any) {
                log('error', 'Seed connection failed:', err)
                this.connectionError = typeof err === 'string' ? err : 'Failed to connect with seed phrase.'
                return { success: false, error: this.connectionError }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_WITH_SEED_FAILED')
    },
    async connectWithSingleKey(
        this: IIdentityState,
        privateKey: string,
        identityId: string,
        network: 'mainnet' | 'testnet' = 'mainnet'
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null
            try {
                log('info', 'Attempting to connect with single key on network:', network)
                if (!identityId.trim()) {
                    this.connectionError = 'Identity ID is required. Please complete discovery first.'
                    return { success: false, error: this.connectionError }
                }
                // Save keys with the discovered identity
                const payload = {
                    identity_id: identityId.trim(),
                    auth_key: privateKey,
                    transfer_key: privateKey,
                    encryption_key: privateKey
                }
                await invoke('save_private_keys', { network, payload })
                this.username = identityId.trim()
                this.isAuthenticated = true
                // Load the identity to populate store state
                const identities = await this.searchUserIdentities(network)
                if (identities && identities.length > 0) {
                    this.identity = identities[0]
                }
                log('info', 'Single key connection successful. isAuthenticated:', this.isAuthenticated)
                await this.saveToStorage()
                return { success: true, identity: this.identity || undefined }
            } catch (err: any) {
                log('error', 'Single key connection failed:', err)
                this.connectionError = typeof err === 'string' ? err : 'Failed to connect with private key.'
                return { success: false, error: this.connectionError }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_WITH_SINGLE_KEY_FAILED')
    },
    // Legacy wrapper for compatibility
    async connectWithPrivateKeys(
        this: IIdentityState,
        identityId: string,
        authKey: string,
        transferKey: string,
        encryptionKey: string,
        network: 'mainnet' | 'testnet' = 'mainnet',
    ): Promise<ConnectionResult> {
        // Just use the first non-empty key
        const key = authKey || transferKey || encryptionKey
        return this.connectWithSingleKey(key, identityId, network)
    },
    async searchUserIdentities(
        this: IIdentityState,
        network: 'mainnet' | 'testnet'
    ): Promise<any[]> {
        try {
            log('info', 'Searching for user identities on network:', network)
            // Try to get identities from saved seed first
            const result = await invoke<{ success: boolean; result?: any[]; error?: string }>(
                'get_identities_from_seed',
                { network }
            )
            if (result?.success && Array.isArray(result.result)) {
                return result.result
            }
            // Fallback to checking for existing identity data
            const existingIdentity = await loadStorageData<any>('load_identity_data', network)
            if (existingIdentity?.identity_id) {
                return [{
                    identityId: existingIdentity.identity_id,
                    balance: '0',
                    revision: '0',
                    publicKeys: []
                }]
            }
            return []
        } catch (err) {
            log('error', 'Failed to search user identities:', err)
            return []
        }
    },
    async logout(this: IIdentityState) {
        return ErrorBoundary.wrap(async () => {
            try {
                await this.clearStorage()
            } catch (err) {
                log('error', 'Error clearing storage during logout:', err)
            }
            this.username = null
            this.identity = null
            this.balance = null
            this.publicKeys = []
            this.revision = null
            this.isAuthenticated = false
            this.premiumAccess = false
            this.connectionError = null
            this.lastConnected = null
            log('info', 'User logged out successfully')
        }, 'LOGOUT_FAILED')
    },
    clearConnectionError(this: IIdentityState) {
        this.connectionError = null
    },
    async saveToStorage(this: IIdentityState) {
        try {
            const network = await invoke<Settings>('load_settings').then(s => s?.network || 'mainnet')
            if (this.identity) {
                await invoke('save_identity_data', {
                    network,
                    payload: {
                        identity_id: this.identity.identityId || this.username,
                        is_authenticated: this.isAuthenticated,
                        public_keys: this.publicKeys,
                        balance: this.balance,
                        revision: this.revision,
                        last_updated: new Date().toISOString()
                    }
                })
            }
        } catch (err) {
            log('error', 'Failed to save identity to storage:', err)
        }
    },
    async clearStorage(this: IIdentityState) {
        try {
            const network = await invoke<Settings>('load_settings').then(s => s?.network || 'mainnet')
            await Promise.all([
                invoke('remove_mnemonic', { network }),
                invoke('remove_private_keys', { network }),
                invoke('remove_identity_data', { network })
            ])
            log('info', 'Storage cleared for network:', network)
        } catch (err) {
            log('error', 'Failed to clear storage:', err)
        }
    }
})
