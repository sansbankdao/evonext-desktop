// src/stores/identity/actions/connection.ts

import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import { DAPIService } from '@/services/identity/discovery/DAPIService'

import type {
    ConnectionResult,
    DiscoveredIdentity,
    IPublicKey,
    IIdentity,
    IIdentityState,
} from '@/types'


// --- IMPLEMENTATION ---
interface Settings {
    network: 'mainnet' | 'testnet'
    [key: string]: any
}

interface SafeStoragePayload {
    keys: string[]
    identity_id: string
    seed_phrase?: string
}

// Helper to safely load storage
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
                const network: 'mainnet' | 'testnet' = (settings?.network === 'testnet' ? 'testnet' : 'mainnet')
                log('info', 'Initializing from storage for network:', network)
                // Load keys from .safu-testnet.json
                const keysData = await loadStorageData<SafeStoragePayload>('load_private_keys_safe', network)
                if (keysData && keysData.keys && keysData.keys.length > 0 && keysData.identity_id) {
                    // We have keys. Verify them by fetching identity.
                    const authKey = keysData.keys[0]
                    const derivationResult = await KeyDerivationService.deriveAllPossibleHashes(authKey || '', network)
                    if (derivationResult.hashes.length > 0) {
                        const result = await DAPIService.queryIdentityByHash(derivationResult.hashes[0] || '', network, true)
                        if (result.success && result.data) {
                            log('info', 'Verified stored key identity ID:', result.data.identityId)
                            this.isAuthenticated = true
                            // 1. Set username to the Identity ID string
                            this.username = result.data.identityId
                            // 2. Create minimal IIdentity object for the store
                            this.identity = {
                                identity_idx: 0,
                                publicKeys: result.data.publicKeys || []
                            }
                            // 3. Fetch detailed info
                            if (typeof this.searchUserIdentities === 'function') {
                                await this.searchUserIdentities(network)
                            }
                        } else {
                            log('warn', 'Stored keys do not match any identity on network. Clearing invalid keys.')
                            try {
                                await this.clearStorage()
                            } catch (clearErr) {
                                log('error', 'Failed to clear invalid storage:', clearErr)
                            }
                        }
                    }
                }
            } catch (err) {
                log('error', 'Failed to initialize identity from storage:', err)
            }
        }, 'INIT_FROM_STORAGE_FAILED')
    },

    async connectWithSeed(
        this: IIdentityState,
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'mainnet',
        discoveredIdentityId?: string
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null
            try {
                log('info', 'Attempting to connect with seed phrase on network:', network)
                let targetId: string
                if (discoveredIdentityId) {
                    targetId = discoveredIdentityId
                } else {
                    const identities = await this.searchUserIdentities(network)
                    if (!identities || identities.length === 0) {
                        throw new Error('Identity ID required for connection. Please ensure discovery ran.')
                    }
                    targetId = identities[0]?.identityId || ''
                }
                // Derive keys (Assuming Index 0)
                const matchIndex = 0
                const authDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, matchIndex, 0)
                const transferDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, matchIndex, 3)
                const encDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, matchIndex, 4)
                const authWIF = authDeriv.privateKey.WIF()
                const transferWIF = transferDeriv.privateKey.WIF()
                const encWIF = encDeriv.privateKey.WIF()
                // Save to .safu-testnet.json
                const payload: SafeStoragePayload = {
                    keys: [authWIF, transferWIF, encWIF],
                    identity_id: targetId,
                    seed_phrase: seedPhrase
                }
                await invoke('save_private_keys_safe', { network, payload })
                // Update Store State
                this.isAuthenticated = true
                this.username = targetId // <--- Identity ID goes here
                this.identity = {
                    identity_idx: matchIndex,
                    publicKeys: [] // Populated by searchUserIdentities
                }
                if (typeof this.searchUserIdentities === 'function') {
                    await this.searchUserIdentities(network)
                }
                log('info', `Seed connection successful. Identity ID: ${targetId}`)
                await this.saveToStorage()
                return { success: true, identity: this.identity }
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
                const trimmedId = identityId.trim()
                if (!trimmedId) {
                    this.connectionError = 'Identity ID is required. Please complete discovery first.'
                    return { success: false, error: this.connectionError }
                }
                const payload: SafeStoragePayload = {
                    keys: [privateKey],
                    identity_id: trimmedId
                }
                await invoke('save_private_keys_safe', { network, payload })
                this.username = trimmedId // <--- Identity ID goes here
                this.isAuthenticated = true
                this.identity = {
                    identity_idx: 0,
                    publicKeys: []
                }
                if (typeof this.searchUserIdentities === 'function') {
                    await this.searchUserIdentities(network)
                }
                log('info', 'Single key connection successful. isAuthenticated:', this.isAuthenticated)
                await this.saveToStorage()
                return { success: true, identity: this.identity }
            } catch (err: any) {
                log('error', 'Single key connection failed:', err)
                this.connectionError = typeof err === 'string' ? err : 'Failed to connect with private key.'
                return { success: false, error: this.connectionError }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_WITH_SINGLE_KEY_FAILED')
    },

    async searchUserIdentities(
        this: IIdentityState,
        network: 'mainnet' | 'testnet'
    ): Promise<DiscoveredIdentity[]> {
        return ErrorBoundary.wrap(async () => {
            // Use 'this.username' because it contains the identity ID string
            const identityId = this.username
            if (!identityId) {
                return []
            }
            const result = await DAPIService.getIdentityById(identityId, network)
            if (result.success && result.data) {
                const discovered: DiscoveredIdentity = {
                    identityId: result.data.identityId || result.data.id,
                    balance: result.data.balance || '0',
                    revision: result.data.revision || '0',
                    publicKeys: result.data.publicKeys || [],
                    dpnsUsername: result.data.dpnsUsername || null
                }
                // Update Store State
                if (this.identity) {
                    this.identity.publicKeys = discovered.publicKeys
                }
                this.balance = discovered.balance
                this.revision = parseInt(discovered.revision, 10)
                if (typeof this.fetchBalance === 'function') {
                    await this.fetchBalance()
                }
                return [discovered]
            }
            return []
        }, 'SEARCH_USER_IDENTITIES_FAILED')
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
            const settings = await invoke<Settings>('load_settings')
            const network: 'mainnet' | 'testnet' = (settings?.network === 'testnet' ? 'testnet' : 'mainnet')
            // Use 'this.username' (ID string) or fallback
            const idToSave = this.username || (this.identity ? 'unknown' : null)
            if (idToSave) {
                await invoke('save_identity_data', {
                    network,
                    payload: {
                        identity_id: idToSave,
                        is_authenticated: this.isAuthenticated,
                        public_keys: this.publicKeys,
                        balance: this.balance,
                        revision: this.revision?.toString(),
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
            const settings = await invoke<Settings>('load_settings')
            const network: 'mainnet' | 'testnet' = (settings?.network === 'testnet' ? 'testnet' : 'mainnet')
            await Promise.all([
                invoke('remove_identity_data', { network }),
                invoke('remove_private_keys_safe', { network })
            ])
            log('info', 'Storage cleared for network:', network)
        } catch (err) {
            log('error', 'Failed to clear storage:', err)
        }
    }
})
