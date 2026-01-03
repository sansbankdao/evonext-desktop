// src/stores/identity/actions/connection.ts
import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import type {
    ConnectionResult,
    IIdentityState,
    DiscoveredIdentity,
    // IIdentity // Assuming this exists, if not using DiscoveredIdentity structure
} from '@/types'
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
const loadStorageData = async <T>(command: string, network: string, params?: any): Promise<T | null> => {
    try {
        return await invoke<T | null>(command, { network, ...params })
    } catch (err) {
        log('error', `Failed to load storage data for ${command}:`, err)
        return null
    }
}
export const connectionActions = () => ({
    // NEW: Save discovered identities explicitly
    async saveDiscoveredIdentities(
        this: IIdentityState,
        identities: DiscoveredIdentity[],
        network: 'mainnet' | 'testnet',
        keyType: 'seed' | 'private'
    ): Promise<{ success: boolean; savedCount: number; error?: string }> {
        return ErrorBoundary.wrap(async () => {
            try {
                const mappedIdentities = identities.map(id => ({
                    identity_id: id.identityId,
                    identity_idx: id.identityIdx || 0,
                    dpns_username: id.dpnsUsername || null,
                    balance: typeof id.balance === 'string' ? id.balance : id.balance?.toString(),
                    key_type: keyType,
                    discovered_key: null,
                    discovered_at: new Date().toISOString()
                }))
                const count = await invoke<number>('save_discovered_identities', {
                    network,
                    discovered_identities: mappedIdentities
                })
                return { success: true, savedCount: count }
            } catch (err: any) {
                log('error', 'Failed to save discovered identities:', err)
                return { success: false, savedCount: 0, error: err.toString() }
            }
        }, 'SAVE_DISCOVERED_IDENTITIES_FAILED')
    },
    async initFromStorage(this: IIdentityState) {
        return ErrorBoundary.wrap(async () => {
            try {
                const settings = await invoke<Settings>('load_settings')
                const network: 'mainnet' | 'testnet' = (settings?.network === 'testnet' ? 'testnet' : 'mainnet')
                // 1. Try to load Identity Data
                const identityData = await loadStorageData<any>('load_identity_data', network)
                if (identityData?.identity_id && identityData.is_authenticated) {
                    this.username = identityData.identity_id
                    this.identityId = identityData.identity_id
                    this.isAuthenticated = true
                    this.identity = {
                        identityId: identityData.identity_id,
                        identityIdx: identityData.identity_idx || 0,
                        balance: identityData.balance || '0',
                        revision: identityData.revision,
                        publicKeys: identityData.public_keys || []
                    }
                    this.publicKeys = identityData.public_keys || []
                    if (typeof this.searchUserIdentities === 'function') {
                        await this.searchUserIdentities(network)
                    }
                    return
                }
                // 2. Fallback: Load keys
                const keystore = await loadStorageData<any>('load_private_keys', network)
                if (keystore && keystore.identities) {
                    const identityIds = Object.keys(keystore.identities)
                    if (identityIds.length > 0) {
                        const identityId = identityIds[0]!
                        const result = await DAPIService.getIdentityById(identityId, network)
                        if (result.success && result.data) {
                            this.isAuthenticated = true
                            this.username = result.data.identityId
                            this.identityId = result.data.identityId
                            this.identity = {
                                identityId: result.data.identityId,
                                identityIdx: 0,
                                balance: result.data.balance || '0',
                                publicKeys: result.data.publicKeys || []
                            }
                            if (typeof this.saveToStorage === 'function') {
                                await this.saveToStorage(network)
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
        targetId: string,
        identityIndex: number = 0
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null
            try {
                log('info', 'Activating identity from stored keys:', targetId, 'index:', identityIndex)
                // 1. Save Mnemonic
                const mnemonicPayload: IMnemonicPayload = { seed_phrase: seedPhrase }
                try {
                    await invoke('save_mnemonic', { network, payload: mnemonicPayload })
                } catch (mnemonicErr) {
                    log('warn', 'Failed to save mnemonic:', mnemonicErr)
                }
                // 2. Ensure keys are actually in Rust storage
                const existingKeys = await loadStorageData<any[]>('get_identity_private_keys', network, { identity_id: targetId })
                if (!existingKeys || existingKeys.length === 0) {
                    log('warn', 'Keys not found in storage for activation, re-deriving...')
                    // REPLACEMENT FOR deriveKeysForIdentity: Manual Loop
                    const now = new Date().toISOString()
                    const privateKeyEntries: PrivateKeyEntryPayload[] = []
                    // Try to derive the first 5 indices to ensure we catch Auth and Transfer keys
                    for (let i = 0; i < 5; i++) {
                        try {
                            const res = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, identityIndex, i)
                            privateKeyEntries.push({
                                identity_id: targetId,
                                key_id: i, // Assuming sequential ID mapping for fallback
                                purpose: i === 0 ? 0 : 3, // Simplistic purpose assumption for fallback
                                security_level: 0,
                                key_type: 'ecdsa',
                                private_key: res.privateKey.WIF(),
                                public_key: '',
                                derived_from_mnemonic: true,
                                created_at: now,
                                last_used: now
                            })
                        } catch (e) {
                            // ignore derivation errors in loop
                        }
                    }
                    if (privateKeyEntries.length > 0) {
                        await invoke('save_private_keys', {
                            network,
                            identity_id: targetId,
                            private_keys: privateKeyEntries
                        })
                    }
                }
                // 3. Verify and Fetch Identity
                const identityResult = await DAPIService.getIdentityById(targetId, network)
                if (!identityResult.success || !identityResult.data) {
                    throw new Error(`Failed to fetch identity ${targetId} from network`)
                }
                const identityData = identityResult.data
                // 4. Update Store State
                this.isAuthenticated = true
                this.username = targetId
                this.identityId = targetId
                this.identity = {
                    identityId: targetId,
                    identityIdx: identityIndex,
                    balance: identityData.balance || '0',
                    revision: identityData.revision ? Number(identityData.revision) : undefined,
                    publicKeys: identityData.publicKeys || []
                }
                this.publicKeys = identityData.publicKeys || []
                this.balance = identityData.balance?.toString() || '0'
                // 5. Save Identity Data Snapshot
                if (typeof this.saveToStorage === 'function') {
                    await this.saveToStorage(network)
                }
                return {
                    success: true,
                    identityId: targetId,
                    identity: this.identity
                }
            } catch (err: any) {
                log('error', 'Failed to activate identity:', err)
                const errorMsg = typeof err === 'string' ? err : (err.message || 'Failed to connect')
                this.connectionError = errorMsg
                return { success: false, error: errorMsg }
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
                const trimmedId = identityId.trim()
                if (!trimmedId) throw new Error('Identity ID is required')
                // 1. Fetch Identity
                const identityResult = await DAPIService.getIdentityById(trimmedId, network)
                if (!identityResult.success || !identityResult.data) {
                    throw new Error('Failed to fetch identity details')
                }
                const identityData = identityResult.data
                const publicKeys = identityData.publicKeys || []
                // 2. Save Private Key to Rust
                const now = new Date().toISOString()
                const firstAuthKey = publicKeys.find((pk: any) => pk.purpose === 0)
                const privateKeyEntry: PrivateKeyEntryPayload = {
                    identity_id: trimmedId,
                    key_id: firstAuthKey?.id || 0,
                    purpose: 0,
                    security_level: firstAuthKey?.securityLevel || 0,
                    key_type: firstAuthKey?.keyType || 'ecdsa',
                    private_key: privateKey,
                    public_key: firstAuthKey?.data || '',
                    derived_from_mnemonic: false,
                    created_at: now,
                    last_used: now
                }
                await invoke('save_private_keys', {
                    network,
                    identity_id: trimmedId,
                    private_keys: [privateKeyEntry]
                })
                // 3. Activate
                this.isAuthenticated = true
                this.username = trimmedId
                this.identityId = trimmedId
                this.identity = {
                    identityId: trimmedId,
                    identityIdx: 0,
                    balance: identityData.balance || '0',
                    revision: identityData.revision ? Number(identityData.revision) : undefined,
                    publicKeys: publicKeys
                }
                if (typeof this.saveToStorage === 'function') {
                    await this.saveToStorage(network)
                }
                return {
                    success: true,
                    identityId: trimmedId,
                    identity: this.identity
                }
            } catch (err: any) {
                log('error', 'Single key connection failed:', err)
                const errorMsg = typeof err === 'string' ? err : (err.message || 'Failed to connect')
                this.connectionError = errorMsg
                return { success: false, error: errorMsg }
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
            const identityId = this.username || this.identityId
            if (!identityId) return []
            const result = await DAPIService.getIdentityById(identityId, network)
            if (result.success && result.data) {
                const discovered: DiscoveredIdentity = {
                    identityId: result.data.identityId || result.data.id || identityId,
                    identityIdx: this.identity?.identityIdx || 0,
                    balance: result.data.balance || '0',
                    revision: result.data.revision,
                    publicKeys: result.data.publicKeys || [],
                    dpnsUsername: result.data.dpnsUsername || null
                }
                if (this.identity) {
                    this.identity.publicKeys = discovered.publicKeys || []
                    this.identity.balance = discovered.balance
                    this.identity.revision = discovered.revision
                }
                this.balance = discovered.balance?.toString() || null
                return [discovered]
            }
            return []
        }, 'SEARCH_USER_IDENTITIES_FAILED')
    },
    async saveToStorage(this: IIdentityState, networkOverride?: 'mainnet' | 'testnet') {
        const storage = this as any
        if (typeof storage.saveToStorage === 'function') {
            await storage.saveToStorage(networkOverride)
        }
    },
    async clearStorage(this: IIdentityState) {
        try {
            const settings = await invoke<Settings>('load_settings')
            const network: 'mainnet' | 'testnet' = (settings?.network === 'testnet' ? 'testnet' : 'mainnet')
            await Promise.all([
                invoke('delete_identity_data', { network }),
                invoke('delete_private_keys', { network }),
                invoke('delete_mnemonic', { network }),
                invoke('clear_discovered_identities', { network })
            ])
            log('info', 'Storage cleared for network:', network)
        } catch (err) {
            log('error', 'Failed to clear storage:', err)
        }
    },
    async logout(this: IIdentityState) {
        if (typeof this.clearStorage === 'function') await this.clearStorage()
        this.username = null
        this.identityId = null
        this.identity = null
        this.isAuthenticated = false
    },
    clearConnectionError(this: IIdentityState) {
        this.connectionError = null
    }
})
