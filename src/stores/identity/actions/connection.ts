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
    IIdentityState,
} from '@/types'

// --- IMPLEMENTATION ---
interface Settings {
    network: 'mainnet' | 'testnet'
    [key: string]: any
}

interface PrivateKeyEntryPayload {
    identity_id: string
    key_id: number
    purpose: number
    security_level: number
    key_type: string
    private_key: string
    public_key?: string
    derived_from_mnemonic?: boolean
    created_at: string
    last_used: string
}

interface IMnemonicPayload {
    seed_phrase: string
}

interface PrivateKeyStorePayload {
    mnemonic?: IMnemonicPayload
    identities: Record<string, PrivateKeyEntryPayload[]>
}

// Helper to safely load storage
const loadStorageData = async <T>(command: string, network: string, params?: any): Promise<T | null> => {
    try {
        return await invoke<T | null>(command, { network, ...params })
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

                // Load the entire keystore
                const keystore = await loadStorageData<PrivateKeyStorePayload>('load_private_keys', network)

                if (keystore && keystore.identities) {
                    // Get the first identity for now (we'll need to handle multiple identities later)
                    const identityIds = Object.keys(keystore.identities)
                    if (identityIds.length > 0) {
                        const identityId = identityIds[0]!
                        const keys = keystore.identities[identityId]

                        if (keys && keys.length > 0) {
                            // Use the first auth key (purpose 0)
                            const authKey = keys.find(k => k.purpose === 0)
                            if (authKey) {
                                const derivationResult = await KeyDerivationService.deriveAllPossibleHashes(authKey.private_key, network)
                                if (derivationResult.hashes.length > 0) {
                                    const result = await DAPIService.queryIdentityByHash(derivationResult.hashes[0] || '', network, true)
                                    if (result.success && result.data && result.data.identityId === identityId) {
                                        log('info', 'Verified stored key matches identity ID:', result.data.identityId)
                                        this.isAuthenticated = true
                                        this.username = result.data.identityId
                                        this.identity = {
                                            identityIdx: 0, // We'll need to store this separately
                                            publicKeys: result.data.publicKeys || []
                                        }

                                        // Update stored public keys if we have them from identity query
                                        if (result.data.publicKeys && result.data.publicKeys.length > 0) {
                                            try {
                                                const updatedKeys = keys.map(k => {
                                                    // Find matching public key by purpose or other identifier
                                                    const matchingPublicKey = result.data?.publicKeys?.
                                                        find((pk: IPublicKey) => pk.purpose === k.purpose && pk.securityLevel === k.security_level)
                                                    return {
                                                        ...k,
                                                        // Update public key data if we have it
                                                        public_key: matchingPublicKey?.data || k.public_key || "",
                                                        key_id: matchingPublicKey?.id || k.key_id
                                                    }
                                                })

                                                await invoke('save_private_keys', {
                                                    network,
                                                    identity_id: identityId,
                                                    private_keys: updatedKeys
                                                })
                                            } catch (updateErr) {
                                                log('warn', 'Failed to update public keys in storage:', updateErr)
                                            }
                                        }

                                        if (typeof this.searchUserIdentities === 'function') {
                                            await this.searchUserIdentities(network)
                                        }
                                    } else {
                                        const foundId = result.success && result.data ? result.data.identityId : 'none'
                                        log('warn', `Stored keys for ${identityId} do not match found identity ${foundId}. Clearing.`)
                                        try {
                                            await invoke('delete_identity_keys', { network, identity_id: identityId })
                                        } catch (clearErr) {
                                            log('error', 'Failed to clear invalid identity keys:', clearErr)
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Fallback: check if we have identity data stored separately
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

                // Save mnemonic separately
                const mnemonicPayload: IMnemonicPayload = { seed_phrase: seedPhrase }
                await invoke('save_mnemonic', {
                    network,
                    mnemonic: mnemonicPayload
                })

                // Save keys using the SINGLE KEY format for backward compatibility
                // const now = new Date().toISOString()
                await invoke('save_single_identity_keys', {
                    network,
                    identity_id: targetId,
                    auth_key: authWIF,
                    transfer_key: transferWIF,
                    encryption_key: encWIF,
                    seed_phrase: seedPhrase
                })

                // Update Store State
                this.isAuthenticated = true
                this.username = targetId
                this.identity = {
                    identityIdx: matchIndex,
                    publicKeys: []
                }

                // Fetch identity details
                if (typeof this.searchUserIdentities === 'function') {
                    const searchResult = await this.searchUserIdentities(network)
                    if (searchResult.length > 0 && searchResult[0]?.publicKeys) {
                        // We can optionally update the storage with actual public key IDs from the identity
                        log('info', `Found ${searchResult[0].publicKeys.length} public keys for identity ${targetId}`)
                    }
                }

                log('info', `Seed connection successful. Identity ID: ${targetId}, Index: ${matchIndex}`)

                // Save identity data separately
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

                // For single key, we need to detect its purpose
                // For now, assume it's an auth key (purpose 0) and use single key format
                // const now = new Date().toISOString()
                await invoke('save_single_identity_keys', {
                    network,
                    identity_id: trimmedId,
                    auth_key: privateKey,
                    transfer_key: "", // Empty for single key mode
                    encryption_key: "", // Empty for single key mode
                    seed_phrase: null // No seed phrase for single key
                })

                this.username = trimmedId
                this.isAuthenticated = true
                this.identity = {
                    identityIdx: 0,
                    publicKeys: []
                }

                if (typeof this.searchUserIdentities === 'function') {
                    await this.searchUserIdentities(network)
                }

                log('info', 'Single key connection successful. isAuthenticated:', this.isAuthenticated)

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
