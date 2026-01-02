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
interface IdentityPublicKeyPayload {
    type_: string
    purpose: number
    security_level: number
    data: string
    read_only: boolean
    disabled_at?: string | null
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
                    // Get the first identity for now (we'll need to handle multiple identities later)
                    const identityIds = Object.keys(keystore.identities)
                    if (identityIds.length > 0) {
                        const identityId = identityIds[0]
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
                                                await invoke('save_private_keys', {
                                                    network,
                                                    identity_id: identityId,
                                                    private_keys: keys.map(k => ({
                                                        ...k,
                                                        // Update public key data if we have it
                                                        public_key: result.data.publicKeys.find(pk => pk.id === k.key_id)?.data || k.public_key
                                                    }))
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
                await invoke('save_mnemonic', { network, payload: mnemonicPayload })
                // Save keys using modern format
                const now = new Date().toISOString()
                const privateKeys: PrivateKeyEntryPayload[] = [
                    {
                        identity_id: targetId,
                        key_id: 0, // Master auth key
                        purpose: 0, // AUTHENTICATION
                        security_level: 0, // MASTER
                        key_type: "ecdsa",
                        private_key: authWIF,
                        public_key: authDeriv.publicKey,
                        derived_from_mnemonic: true,
                        created_at: now,
                        last_used: now,
                    },
                    {
                        identity_id: targetId,
                        key_id: 3, // Transfer key (purpose 3)
                        purpose: 3, // TRANSFER
                        security_level: 0, // MASTER
                        key_type: "ecdsa",
                        private_key: transferWIF,
                        public_key: transferDeriv.publicKey,
                        derived_from_mnemonic: true,
                        created_at: now,
                        last_used: now,
                    },
                    {
                        identity_id: targetId,
                        key_id: 4, // Encryption key (purpose 4)
                        purpose: 4, // ENCRYPTION
                        security_level: 0, // MASTER
                        key_type: "ecdsa",
                        private_key: encWIF,
                        public_key: encDeriv.publicKey,
                        derived_from_mnemonic: true,
                        created_at: now,
                        last_used: now,
                    },
                ]
                await invoke('save_private_keys', {
                    network,
                    identity_id: targetId,
                    private_keys: privateKeys
                })
                // Update Store State
                this.isAuthenticated = true
                this.username = targetId
                this.identity = {
                    identityIdx: matchIndex,
                    publicKeys: []
                }
                // Fetch identity details
                const searchResult = await this.searchUserIdentities(network)
                if (searchResult.length > 0 && searchResult[0]?.publicKeys) {
                    // We can update the storage with actual public key IDs from the identity
                    const identityPublicKeys = searchResult[0].publicKeys
                    // You might want to update the key_id values based on actual public key IDs from the identity
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
                // For now, assume it's an auth key (purpose 0)
                const now = new Date().toISOString()
                const privateKeys: PrivateKeyEntryPayload[] = [
                    {
                        identity_id: trimmedId,
                        key_id: 0, // We don't know the actual key_id yet
                        purpose: 0, // Assume AUTHENTICATION
                        security_level: 0, // Assume MASTER
                        key_type: "ecdsa",
                        private_key: privateKey,
                        public_key: "", // Will be populated when we query the identity
                        derived_from_mnemonic: false,
                        created_at: now,
                        last_used: now,
                    }
                ]
                await invoke('save_private_keys', {
                    network,
                    identity_id: trimmedId,
                    private_keys: privateKeys
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
    // ... rest of the functions remain similar ...
})
