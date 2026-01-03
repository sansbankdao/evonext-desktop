// src/stores/identity/actions/connection.ts - FINAL
import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import type {
    ConnectionResult,
    IIdentityState,
    DiscoveredIdentity,
    IPublicKey
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
                const keystore = await loadStorageData<any>('load_private_keys', network)
                if (keystore && keystore.identities) {
                    // Get the first identity for now
                    const identityIds = Object.keys(keystore.identities)
                    if (identityIds.length > 0) {
                        const identityId = identityIds[0]!
                        const keys = keystore.identities[identityId]
                        if (keys && keys.length > 0) {
                            // Use the first auth key (purpose 0)
                            const authKey = keys.find((k: any) => k.purpose === 0)
                            if (authKey) {
                                const derivationResult = await KeyDerivationService.deriveAllPossibleHashes(authKey.private_key, network)
                                if (derivationResult.hashes.length > 0) {
                                    const result = await DAPIService.queryIdentityByHash(derivationResult.hashes[0] || '', network, true)
                                    if (result.success && result.data && result.data.identityId === identityId) {
                                        log('info', 'Verified stored key matches identity ID:', result.data.identityId)
                                        this.isAuthenticated = true
                                        this.username = result.data.identityId
                                        this.identityId = result.data.identityId
                                        this.identity = {
                                            identityId: result.data.identityId,
                                            identityIdx: 0,
                                            balance: result.data.balance || '0',
                                            revision: result.data.revision ? Number(result.data.revision) : undefined,
                                            publicKeys: result.data.publicKeys || []
                                        }
                                        // Save identity data to storage
                                        if (typeof this.saveToStorage === 'function') {
                                            await this.saveToStorage(network)
                                        }
                                        if (typeof this.searchUserIdentities === 'function') {
                                            await this.searchUserIdentities(network)
                                        }
                                    } else {
                                        const foundId = result.success && result.data ? result.data.identityId : 'none'
                                        log('warn', `Stored keys for ${identityId} do not match found identity ${foundId}. Clearing.`)
                                        try {
                                            await invoke('delete_identity_keys', {
                                                network,
                                                identity_id: identityId
                                            })
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
                        this.identityId = identityData.identity_id
                        this.isAuthenticated = identityData.is_authenticated
                        this.identity = {
                            identityId: identityData.identity_id,
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
                log('info', 'Activating previously discovered identity from stored keys:', targetId, 'index:', identityIndex)
                // Keys are already saved in Rust storage by SeedDiscovery.ts during discovery
                // Just verify we have keys and activate the identity
                // OPTIONAL: Save seed phrase to storage
                const mnemonicPayload: IMnemonicPayload = { seed_phrase: seedPhrase }
                try {
                    await invoke('save_mnemonic', {
                        network,
                        payload: mnemonicPayload
                    })
                    log('info', 'Mnemonic saved to storage')
                } catch (mnemonicErr) {
                    log('warn', 'Failed to save mnemonic:', mnemonicErr)
                    // Continue anyway - keys are already saved
                }
                // Verify identity exists by querying it
                const identityResult = await DAPIService.getIdentityById(targetId, network)
                if (!identityResult.success || !identityResult.data) {
                    throw new Error(`Failed to fetch identity ${targetId} from network`)
                }
                const identityData = identityResult.data
                const publicKeys = identityData.publicKeys || []
                // Update Store State
                this.isAuthenticated = true
                this.username = targetId
                this.identityId = targetId
                this.identity = {
                    identityId: targetId,
                    identityIdx: identityIndex,
                    balance: identityData.balance || '0',
                    revision: identityData.revision ? Number(identityData.revision) : undefined,
                    publicKeys: publicKeys
                }
                this.publicKeys = publicKeys
                this.balance = identityData.balance?.toString() || '0'
                this.revision = identityData.revision ? Number(identityData.revision) : null
                // Fetch identity details
                if (typeof this.searchUserIdentities === 'function') {
                    await this.searchUserIdentities(network)
                }
                log('info', `Identity ${targetId} activated successfully. Index: ${identityIndex}`)
                // Save basic identity data (not keys - those are already saved)
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
                // Fallback: Try to derive keys if activation failed
                try {
                    log('info', 'Attempting fallback: deriving keys from seed...')
                    const authDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, identityIndex, 0)
                    const transferDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, identityIndex, 3)
                    const encDeriv = await KeyDerivationService.getPrivateKeyWASM(seedPhrase, network, identityIndex, 4)
                    const authWIF = authDeriv.privateKey.WIF()
                    const transferWIF = transferDeriv.privateKey.WIF()
                    const encWIF = encDeriv.privateKey.WIF()
                    // Save keys using the single key format for backward compatibility
                    await invoke('save_single_identity_keys', {
                        network,
                        identity_id: targetId,
                        auth_key: authWIF,
                        transfer_key: transferWIF,
                        encryption_key: encWIF,
                        seed_phrase: seedPhrase
                    })
                    log('info', 'Fallback: derived and saved keys')
                    // Try activation again
                    const identityResult = await DAPIService.getIdentityById(targetId, network)
                    const identityData = identityResult.data
                    const publicKeys = identityData?.publicKeys || []
                    this.isAuthenticated = true
                    this.username = targetId
                    this.identityId = targetId
                    this.identity = {
                        identityId: targetId,
                        identityIdx: identityIndex,
                        balance: identityData?.balance || '0',
                        revision: identityData?.revision ? Number(identityData.revision) : undefined,
                        publicKeys: publicKeys
                    }
                    this.publicKeys = publicKeys
                    this.balance = identityData?.balance?.toString() || '0'
                    this.revision = identityData?.revision ? Number(identityData.revision) : null
                    if (typeof this.searchUserIdentities === 'function') {
                        await this.searchUserIdentities(network)
                    }
                    if (typeof this.saveToStorage === 'function') {
                        await this.saveToStorage(network)
                    }
                    return {
                        success: true,
                        identityId: targetId,
                        identity: this.identity
                    }
                } catch (fallbackErr: any) {
                    log('error', 'Fallback also failed:', fallbackErr)
                    this.connectionError = typeof err === 'string' ? err : 'Failed to connect with seed phrase.'
                    return { success: false, error: this.connectionError }
                }
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
                // Fetch identity details first
                const identityResult = await DAPIService.getIdentityById(trimmedId, network)
                if (!identityResult.success || !identityResult.data) {
                    this.connectionError = 'Failed to fetch identity details from network'
                    return { success: false, error: this.connectionError }
                }
                const identityData = identityResult.data
                const publicKeys = identityData.publicKeys || []
                // Save private key immediately
                const now = new Date().toISOString()
                const privateKeyEntries: PrivateKeyEntryPayload[] = []
                // Find first authentication key
                const firstAuthKey = publicKeys.find(pk => pk.purpose === 0)
                const privateKeyEntry: PrivateKeyEntryPayload = {
                    identity_id: trimmedId,
                    key_id: firstAuthKey?.id || 0,
                    purpose: 0, // AUTHENTICATION
                    security_level: firstAuthKey?.securityLevel || 0,
                    key_type: firstAuthKey?.keyType || 'ecdsa',
                    private_key: privateKey,
                    public_key: firstAuthKey?.data || '',
                    derived_from_mnemonic: false,
                    created_at: now,
                    last_used: now
                }
                privateKeyEntries.push(privateKeyEntry)
                // Save to Rust storage
                await invoke('save_private_keys', {
                    network,
                    identity_id: trimmedId,
                    private_keys: privateKeyEntries
                })
                log('info', `Saved private key for identity ${trimmedId}, key_id: ${privateKeyEntry.key_id}`)
                // Update Store State
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
                this.publicKeys = publicKeys
                this.balance = identityData.balance?.toString() || null
                this.revision = identityData.revision ? Number(identityData.revision) : null
                log('info', 'Single key connection successful. isAuthenticated:', this.isAuthenticated)
                // Save identity data
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
            const identityId = this.username || this.identityId
            if (!identityId) {
                return []
            }
            const result = await DAPIService.getIdentityById(identityId, network)
            if (result.success && result.data) {
                const discovered: DiscoveredIdentity = {
                    identityId: result.data.identityId || result.data.id || identityId,
                    identityIdx: this.identity?.identityIdx || 0,
                    balance: result.data.balance || '0',
                    revision: result.data.revision ? Number(result.data.revision) : undefined,
                    publicKeys: result.data.publicKeys || [],
                    dpnsUsername: result.data.dpnsUsername || null
                }
                // Update Store State
                if (this.identity) {
                    this.identity.publicKeys = discovered.publicKeys || []
                    this.identity.balance = discovered.balance
                    this.identity.revision = discovered.revision
                    this.identity.identityId = discovered.identityId
                }
                this.balance = discovered.balance?.toString() || null
                this.revision = discovered.revision || null
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
            this.identityId = null
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
        // This is implemented in storageActions.ts - just call the action
        // The actual implementation is in storageActions.ts
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
                invoke('delete_mnemonic', { network })
            ])
            log('info', 'Storage cleared for network:', network)
        } catch (err) {
            log('error', 'Failed to clear storage:', err)
        }
    }
})
