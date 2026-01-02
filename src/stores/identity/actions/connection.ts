// src/stores/identity/actions/connection.ts

import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import { DAPIService } from '@/services/identity/discovery/DAPIService'

import type {
    ConnectionResult,
    DiscoveredIdentity,
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
    identity_index?: number  // Added
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

                // Load keys from .safu-testnet.json - FIXED COMMAND NAME
                const keysData = await loadStorageData<SafeStoragePayload>('load_private_keys', network)

                if (keysData && keysData.keys && keysData.keys.length > 0 && keysData.identity_id) {
                    // We have keys. Verify them by fetching identity.
                    const authKey = keysData.keys[0]
                    const derivationResult = await KeyDerivationService.deriveAllPossibleHashes(authKey || '', network)

                    if (derivationResult.hashes.length > 0) {
                        const result = await DAPIService.queryIdentityByHash(derivationResult.hashes[0] || '', network, true)
                        // FIXED: Verify identity matches stored ID
                        if (result.success && result.data && result.data.identityId === keysData.identity_id) {
                            log('info', 'Verified stored key identity ID:', result.data.identityId)
                            this.isAuthenticated = true
                            this.username = result.data.identityId
                            this.identity = {
                                identityIdx: keysData.identity_index || 0, // Use stored index
                                publicKeys: result.data.publicKeys || []
                            }
                            if (typeof this.searchUserIdentities === 'function') {
                                await this.searchUserIdentities(network)
                            }
                        } else {
                            const foundId = result.success && result.data ? result.data.identityId : 'none'
                            log('warn', `Stored keys for ${keysData.identity_id} do not match found identity ${foundId}. Clearing invalid keys.`)
                            try {
                                if (typeof this.clearStorage === 'function') {
                                    await this.clearStorage()
                                }
                            } catch (clearErr) {
                                log('error', 'Failed to clear invalid storage:', clearErr)
                            }
                        }
                    }
                } else {
                    // Also check if we have identity data stored separately
                    const identityData = await loadStorageData<any>('load_identity_data', network)
                    if (identityData?.identity_id && identityData.is_authenticated) {
                        this.username = identityData.identity_id
                        this.isAuthenticated = identityData.is_authenticated
                        this.identity = {
                            identityIdx: 0,
                            publicKeys: []
                        }
                        if (typeof this.searchUserIdentities === 'function') {
                            await this.searchUserIdentities(network)
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
        targetId: string,
        identityIndex: number = 0
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null

            try {
                log('info', 'Attempting to connect with seed phrase on network:', network, 'index:', identityIndex)

                // Derive keys using the specific identity index
                const matchIndex = identityIndex
                const authDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, matchIndex, 0)
                const transferDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, matchIndex, 3)
                const encDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, matchIndex, 4)
                const authWIF = authDeriv.privateKey.WIF()
                const transferWIF = transferDeriv.privateKey.WIF()
                const encWIF = encDeriv.privateKey.WIF()

                // Save to backend storage
                const payload: SafeStoragePayload = {
                    keys: [authWIF, transferWIF, encWIF],
                    identity_id: targetId,
                    seed_phrase: seedPhrase,
                    identity_index: identityIndex
                }

                await invoke('save_private_keys', { network, payload })
                await invoke('save_mnemonic', {
                    network,
                    payload: { mnemonic: seedPhrase }
                })

                // Update Store State
                this.isAuthenticated = true
                this.username = targetId
                this.identity = {
                    identityIdx: matchIndex,
                    publicKeys: []
                }

                // FIX: Call methods safely
                if (typeof this.searchUserIdentities === 'function') {
                    await this.searchUserIdentities(network)
                }

                log('info', `Seed connection successful. Identity ID: ${targetId}, Index: ${matchIndex}`)

                // FIX: Call saveToStorage method safely
                if (typeof this.saveToStorage === 'function') {
                    await this.saveToStorage(network)
                }

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

                await invoke('save_private_keys', { network, payload })

                this.username = trimmedId
                this.isAuthenticated = true
                this.identity = {
                    identityIdx: 0,
                    publicKeys: []
                }

                // FIX: Call methods safely
                if (typeof this.searchUserIdentities === 'function') {
                    await this.searchUserIdentities(network)
                }

                log('info', 'Single key connection successful. isAuthenticated:', this.isAuthenticated)

                // FIX: Call saveToStorage method safely
                if (typeof this.saveToStorage === 'function') {
                    await this.saveToStorage(network)
                }

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
            const identityId = this.username
            if (!identityId) {
                return []
            }
            const result = await DAPIService.getIdentityById(identityId, network)
            if (result.success && result.data) {
                const discovered: DiscoveredIdentity = {
                    identityId: result.data.identityId || result.data.id,
                    identityIdx: this.identity?.identityIdx || 0,
                    balance: result.data.balance || '0',
                    revision: result.data.revision || '0',
                    publicKeys: result.data.publicKeys || [],
                    dpnsUsername: result.data.dpnsUsername || null
                }
                // Update Store State
                if (this.identity) {
                    this.identity.publicKeys = discovered.publicKeys || []
                }
                this.balance = discovered.balance?.toString() || null
                this.revision = Number(discovered.revision) || null
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
                if (typeof this.clearStorage === 'function') {
                    await this.clearStorage()
                }
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

    async saveToStorage(this: IIdentityState, networkOverride?: 'mainnet' | 'testnet') {
        try {
            const settings = networkOverride ? { network: networkOverride } : await invoke<Settings>('load_settings')
            const network: 'mainnet' | 'testnet' = (settings?.network === 'testnet' ? 'testnet' : 'mainnet')
            const idToSave = this.username || (this.identity ? 'unknown' : null)
            if (idToSave && this.isAuthenticated) {
                await invoke('save_identity_data', {
                    network,
                    payload: {
                        identity_id: idToSave,
                        is_authenticated: this.isAuthenticated,
                        public_keys: this.publicKeys || [],
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
                invoke('delete_identity_data', { network }),
                invoke('delete_private_keys', { network }),
                invoke('delete_mnemonic', { network })
            ])
            log('info', 'Storage cleared for network:', network)
        } catch (err) {
            log('error', 'Failed to clear storage:', err)
        }
    }
})
