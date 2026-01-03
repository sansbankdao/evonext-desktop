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
    IIdentity
} from '@/types'

// Helper interfaces
interface Settings {
    network: 'mainnet' | 'testnet'
    [key: string]: any
}

// Helper with Logging
const loadStorageData = async <T>(command: string, network: string, params?: any): Promise<T | null> => {
    try {
        console.log(`[DEBUG Frontend Storage] Loading ${command}...`);
        let args = { network, ...params };
        // Ensure camelCase for specific arguments if needed
        if(params && params.identity_id) {
             args.identityId = params.identity_id;
             delete args.identity_id;
        }
        return await invoke<T | null>(command, args)
    } catch (err) {
        console.error(`[DEBUG Frontend Storage] Failed ${command}:`, err)
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
                // Map frontend DiscoveredIdentity to Rust arguments
                // Note: Rust struct fields are snake_case, but Tauri command args are camelCase
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
                    discoveredIdentities: mappedIdentities // camelCase argument name
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

                    const restoredIdentity: IIdentity = {
                        identityId: identityData.identity_id,
                        identityIdx: identityData.identity_idx || 0,
                        balance: identityData.balance || '0',
                        revision: identityData.revision,
                        publicKeys: identityData.public_keys || []
                    }
                    this.identity = restoredIdentity
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

                            const restoredIdentity: IIdentity = {
                                identityId: result.data.identityId,
                                identityIdx: 0,
                                balance: result.data.balance || '0',
                                publicKeys: result.data.publicKeys || []
                            }
                            this.identity = restoredIdentity

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
            console.log(`[DEBUG Frontend Connect] Starting seed connection for ${targetId}`);

            try {
                // 1. Save Mnemonic
                await invoke('save_mnemonic', { network, payload: { seed_phrase: seedPhrase } })

                // 2. Ensure keys are in Rust storage
                const existingKeys = await loadStorageData<any[]>('get_identity_private_keys', network, { identity_id: targetId })

                if (!existingKeys || existingKeys.length === 0) {
                    console.log('[DEBUG Frontend Connect] Keys missing, performing manual derivation fallback');
                    const now = new Date().toISOString()
                    const privateKeyEntries: any[] = []

                    // Fallback derivation loop
                    for (let i = 0; i < 5; i++) {
                        try {
                            const res = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, identityIndex, i)
                            privateKeyEntries.push({
                                identity_id: targetId,
                                key_id: i,
                                purpose: i === 0 ? 0 : 3,
                                security_level: 0,
                                key_type: 'ecdsa',
                                private_key: res.privateKey.WIF(),
                                public_key: '',
                                derived_from_mnemonic: true,
                                created_at: now,
                                last_used: now
                            })
                        } catch (e) { /* ignore */ }
                    }
console.log('[DEBUG] privateKeyEntries', JSON.stringify(privateKeyEntries, null, 2))
                    if (privateKeyEntries.length > 0) {
                        await invoke('save_private_keys', {
                            network,
                            identityId: targetId,         // camelCase
                            privateKeys: privateKeyEntries // camelCase
                        })
                    }
                }

                // 3. Verify Identity
                const identityResult = await DAPIService.getIdentityById(targetId, network)

                if (!identityResult.success || !identityResult.data) {
                    throw new Error(`Failed to fetch identity ${targetId} from network`)
                }

                const identityData = identityResult.data

                // 4. Update Store State
                this.isAuthenticated = true
                this.username = targetId
                this.identityId = targetId

                // DEFINE LOCALLY to ensure type safety (non-null) for return
                const activeIdentity: IIdentity = {
                    identityId: targetId,
                    identityIdx: identityIndex,
                    balance: identityData.balance || '0',
                    revision: identityData.revision ? Number(identityData.revision) : undefined,
                    publicKeys: identityData.publicKeys || []
                }

                this.identity = activeIdentity
                this.publicKeys = identityData.publicKeys || []
                this.balance = identityData.balance?.toString() || '0'

                // 5. Save Identity Data Snapshot
                if (typeof this.saveToStorage === 'function') {
                    await this.saveToStorage(network)
                }

                return {
                    success: true,
                    identityId: targetId,
                    identity: activeIdentity // Return local variable (non-null)
                }
            } catch (err: any) {
                console.error('[DEBUG Frontend Connect Error]', err);
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
            console.log(`[DEBUG Frontend SingleKey] Connecting with ID: "${identityId}"`);

            try {
                const trimmedId = identityId.trim()
                if (!trimmedId) throw new Error('Identity ID is required')

                // 1. Fetch Identity
                const identityResult = await DAPIService.getIdentityById(trimmedId, network)

                if (!identityResult.success || !identityResult.data) {
                    throw new Error('Failed to fetch identity details.')
                }

                const identityData = identityResult.data
                const publicKeys = identityData.publicKeys || []

                // 2. Save Private Key to Rust
                const now = new Date().toISOString()
                const firstAuthKey = publicKeys.find((pk: any) => pk.purpose === 0)

                const privateKeyEntry = {
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
console.log('[DEBUG] privateKeyEntry', JSON.stringify(privateKeyEntry, null, 2))
                await invoke('save_private_keys', {
                    network,
                    identityId: trimmedId,          // camelCase
                    privateKeys: [privateKeyEntry]  // camelCase
                })

                // 3. Activate
                this.isAuthenticated = true
                this.username = trimmedId
                this.identityId = trimmedId

                // DEFINE LOCALLY to ensure type safety (non-null) for return
                const activeIdentity: IIdentity = {
                    identityId: trimmedId,
                    identityIdx: 0,
                    balance: identityData.balance || '0',
                    revision: identityData.revision ? Number(identityData.revision) : undefined,
                    publicKeys: publicKeys
                }

                this.identity = activeIdentity

                if (typeof this.saveToStorage === 'function') {
                    await this.saveToStorage(network)
                }

                return {
                    success: true,
                    identityId: trimmedId,
                    identity: activeIdentity // Return local variable (non-null)
                }
            } catch (err: any) {
                console.error('[DEBUG Frontend SingleKey Error]', err);
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
