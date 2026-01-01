// src/stores/identity/actions/connection.ts
import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import type { IIdentityState, ConnectionResult, DiscoveredIdentity } from '@/types'
import type { IPublicKey } from '@/types'

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
                const network: 'mainnet' | 'testnet' = settings?.network || 'mainnet'
                log('info', 'Initializing from storage for network:', network)

                // Load keys from .safu-testnet.json
                const keysData = await loadStorageData<SafeStoragePayload>('load_private_keys_safe', network)

                if (keysData && keysData.keys && keysData.keys.length > 0 && keysData.identity_id) {
                    // We have keys. Now we need to verify they are valid by fetching the identity.
                    // Use the first key (assuming auth) to check the network.
                    const authKey = keysData.keys[0]

                    // 1. Derive hash from key
                    const derivationResult = await KeyDerivationService.deriveAllPossibleHashes(authKey, network)

                    if (derivationResult.hashes.length > 0) {
                        // 2. Scan network for this hash
                        const result = await DAPIService.queryIdentityByHash(derivationResult.hashes[0], network, true)

                        if (result.success && result.data) {
                            log('info', 'Verified stored key identity ID:', result.data.identityId)
                            this.isAuthenticated = true

                            // Reconstruct basic identity object
                            this.identity = {
                                id: result.data.identityId,
                                identity_idx: 0, // We assume index 0 for restored wallets
                                publicKeys: result.data.publicKeys || []
                            }

                            // Ensure username is a string or null
                            this.username = result.data.identityId

                            // Fetch detailed info (Balance, Revision)
                            if (typeof this.searchUserIdentities === 'function') {
                                await this.searchUserIdentities(network)
                            }
                        } else {
                            log('warn', 'Stored keys do not match any identity on network. Clearing invalid keys.')
                            await this.clearStorage()
                        }
                    }
                }
            } catch (err) {
                log('error', 'Failed to initialize identity from storage:', err)
                // Do not throw, allow app to load in logged-out state
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
                    // Fallback: Try to search (might be slow or fail if backend is gone)
                    const identities = await this.searchUserIdentities(network)
                    if (!identities || identities.length === 0) {
                        throw new Error('Identity ID required for connection. Please ensure discovery ran.')
                    }
                    // Assuming identities returns DiscoveredIdentity[] with 'id' property
                    targetId = identities[0].id
                }

                // Derive keys.
                // Since we don't know the exact identity index, we assume 0 for standard wallets.
                // We will derive Auth (Index 0) and Transfer (Index 2 in DPP, or Key Index 3 in our service)

                const matchIndex = 0

                // Derive keys
                // KeyDerivationService.getPrivateKeyWASM uses identityIndex and keyIndex
                // We use identityIndex 0.
                const authDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, matchIndex, 0)
                const transferDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, matchIndex, 3)
                const encDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, matchIndex, 4)

                const authWIF = authDeriv.privateKey.toWIF()
                const transferWIF = transferDeriv.privateKey.toWIF()
                const encWIF = encDeriv.privateKey.toWIF()

                // Save to .safu-testnet.json
                const payload: SafeStoragePayload = {
                    keys: [authWIF, transferWIF, encWIF],
                    identity_id: targetId,
                    seed_phrase: seedPhrase
                }

                await invoke('save_private_keys_safe', { network, payload })

                // Update Store State
                this.isAuthenticated = true
                this.identity = {
                    identity_idx: matchIndex,
                    id: targetId,
                    publicKeys: [] // Will be populated by searchUserIdentities
                }

                // Ensure username is strictly string or null
                this.username = targetId

                // Fetch full details (Balance, etc)
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

                // Save to .safu-testnet.json
                const payload: SafeStoragePayload = {
                    keys: [privateKey],
                    identity_id: trimmedId
                }

                await invoke('save_private_keys_safe', { network, payload })

                this.username = trimmedId
                this.isAuthenticated = true

                // Load identity to populate store state
                this.identity = {
                    identity_idx: 0,
                    id: trimmedId,
                    publicKeys: [] // Will be populated
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
            if (!this.identity?.id) {
                return []
            }

            // 1. Fetch Identity Object via DAPIService
            const result = await DAPIService.getIdentityById(this.identity.id, network)

            if (result.success && result.data) {
                // Map result.data to DiscoveredIdentity interface
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
                this.revision = discovered.revision

                // Fetch Balance
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
            const network: 'mainnet' | 'testnet' = settings?.network || 'mainnet'

            if (this.identity) {
                await invoke('save_identity_data', {
                    network,
                    payload: {
                        identity_id: this.identity.id || this.username,
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
            const settings = await invoke<Settings>('load_settings')
            const network: 'mainnet' | 'testnet' = settings?.network || 'mainnet'

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
