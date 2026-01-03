// src/stores/identity/actions/storage.ts - FINAL
import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import type {
    IIdentityState,
    DiscoveredIdentity,
    IPublicKey
} from '@/types'
interface Settings {
    network: 'mainnet' | 'testnet'
    [key: string]: any
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
export const storageActions = () => ({
    async saveToStorage(this: IIdentityState, networkOverride?: 'mainnet' | 'testnet') {
        return ErrorBoundary.wrap(async () => {
            const network = networkOverride || await this.getCurrentNetwork()
            const identityId = this.username || this.identityId || this.identity?.identityId || ''
            if (!identityId || !this.isAuthenticated) {
                log('warn', 'Cannot save identity data: no identity or not authenticated')
                return
            }
            // Create payload matching Rust IdentityData struct
            const identityData = {
                username: identityId,
                identity_id: identityId,
                identity_idx: this.identity?.identityIdx || 0,
                balance: this.balance?.toString() || '0',
                is_authenticated: this.isAuthenticated,
                public_keys: this.publicKeys || [],
                revision: this.revision?.toString() || '0',
                created_at: this.lastConnected ? new Date(this.lastConnected).toISOString() : new Date().toISOString(),
                public_key_ids: (this.publicKeys || []).map((key: IPublicKey) => key.id || 0),
            }
            await invoke('save_identity_data', { network, payload: identityData })
            log('info', 'Identity data saved for network:', network, 'identity:', identityId)
        }, 'SAVE_IDENTITY_STORAGE_FAILED')
    },
    async loadFromStorage(this: IIdentityState) {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            const identityData = await loadStorageData<any>('load_identity_data', network)
            if (identityData && identityData.identity_id) {
                log('info', 'Loaded identity data for network:', network, 'identity:', identityData.identity_id)
                // Map Rust IdentityData to IIdentityState
                this.username = identityData.identity_id
                this.identityId = identityData.identity_id
                this.balance = identityData.balance || null
                this.isAuthenticated = identityData.is_authenticated || false
                this.revision = identityData.revision ? Number(identityData.revision) : null
                this.lastConnected = identityData.created_at ? new Date(identityData.created_at).getTime() : null
                // Convert public_keys to IPublicKey format
                if (identityData.public_keys && Array.isArray(identityData.public_keys)) {
                    this.publicKeys = identityData.public_keys.map((key: any) => ({
                        type: 0,
                        keyType: key.type_ || key.keyType || 'ECDSA_SECP256K1',
                        purpose: typeof key.purpose === 'string' ?
                            (key.purpose === 'AUTHENTICATION' ? 0 :
                             key.purpose === 'ENCRYPTION' ? 1 :
                             key.purpose === 'DECRYPTION' ? 2 :
                             key.purpose === 'TRANSFER' ? 3 : 0) :
                            (key.purpose || 0),
                        securityLevel: typeof key.security_level === 'string' ?
                            (key.security_level === 'MASTER' ? 0 :
                             key.security_level === 'CRITICAL' ? 1 :
                             key.security_level === 'HIGH' ? 2 :
                             key.security_level === 'MEDIUM' ? 3 :
                             key.security_level === 'LOW' ? 4 : 0) :
                            (key.security_level || 0),
                        contractBounds: key.contract_bounds,
                        data: key.data || '',
                        dataBytes: key.data_b64 || key.dataBytes || '',
                        readOnly: key.read_only || false,
                        disabledAt: key.disabled_at || null,
                    } as IPublicKey))
                } else {
                    this.publicKeys = []
                }
                // Create DiscoveredIdentity object
                this.identity = {
                    identityId: identityData.identity_id,
                    identityIdx: identityData.identity_idx || 0,
                    balance: identityData.balance || '0',
                    revision: identityData.revision ? Number(identityData.revision) : undefined,
                    publicKeys: this.publicKeys || []
                }
                log('info', 'Successfully loaded identity from storage:', identityData.identity_id)
            } else {
                log('info', 'No valid identity data found for network:', network)
                // Clear state
                this.username = null
                this.identityId = null
                this.identity = null
                this.balance = null
                this.publicKeys = []
                this.revision = null
                this.isAuthenticated = false
                this.isConnecting = false
                this.connectionError = null
                this.premiumAccess = false
                this.lastConnected = null
            }
        }, 'LOAD_IDENTITY_STORAGE_FAILED')
    },
    async clearStorage(this: IIdentityState) {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            await Promise.all([
                invoke('delete_identity_data', { network }),
                invoke('delete_private_keys', { network }),
                invoke('delete_mnemonic', { network }),
                invoke('delete_assets', { network })
            ])
            log('info', 'All storage cleared for network:', network)
            // Clear state
            this.username = null
            this.identityId = null
            this.identity = null
            this.balance = null
            this.publicKeys = []
            this.revision = null
            this.isAuthenticated = false
            this.isConnecting = false
            this.connectionError = null
            this.premiumAccess = false
            this.lastConnected = null
        }, 'CLEAR_IDENTITY_STORAGE_FAILED')
    },
    async loadPrivateKeys(this: any) {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            return await invoke('load_private_keys', { network })
        }, 'LOAD_PRIVATE_KEYS_FAILED')
    },
    async savePrivateKeys(this: any, keys: any) {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            await invoke('save_private_keys', { network, payload: keys })
        }, 'SAVE_PRIVATE_KEYS_FAILED')
    },
    async loadMnemonic(this: any) {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            return await invoke('load_mnemonic', { network })
        }, 'LOAD_MNEMONIC_FAILED')
    },
    async saveMnemonic(this: any, mnemonic: { seed_phrase: string }) {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            await invoke('save_mnemonic', { network, payload: mnemonic })
        }, 'SAVE_MNEMONIC_FAILED')
    },
    async getIdentityFromStorage(this: IIdentityState): Promise<DiscoveredIdentity | null> {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            const identityData = await loadStorageData<any>('load_identity_data', network)
            if (identityData && identityData.identity_id) {
                const publicKeys = identityData.public_keys || []
                const mappedKeys = publicKeys.map((key: any) => ({
                    type: 0,
                    keyType: key.type_ || key.keyType || 'ECDSA_SECP256K1',
                    purpose: key.purpose || 0,
                    securityLevel: key.security_level || 0,
                    contractBounds: key.contract_bounds,
                    data: key.data || '',
                    dataBytes: key.data_b64 || key.dataBytes || '',
                    readOnly: key.read_only || false,
                    disabledAt: key.disabled_at || null,
                } as IPublicKey))
                return {
                    identityId: identityData.identity_id,
                    identityIdx: identityData.identity_idx || 0,
                    balance: identityData.balance || '0',
                    revision: identityData.revision ? Number(identityData.revision) : undefined,
                    publicKeys: mappedKeys
                }
            }
            return null
        }, 'GET_IDENTITY_FROM_STORAGE_FAILED')
    },
    async updateBalanceInStorage(this: IIdentityState, newBalance: string) {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            const identityData = await loadStorageData<any>('load_identity_data', network)
            if (identityData && identityData.identity_id) {
                identityData.balance = newBalance
                await invoke('save_identity_data', { network, payload: identityData })
                this.balance = newBalance
                log('info', 'Balance updated for network:', network, 'Balance:', newBalance)
            }
        }, 'UPDATE_BALANCE_STORAGE_FAILED')
    },
    async getCurrentNetwork(this: any): Promise<'mainnet' | 'testnet'> {
        try {
            const settings = await invoke<Settings>('load_settings')
            return settings?.network === 'testnet' ? 'testnet' : 'mainnet'
        } catch (error) {
            log('error', 'Failed to load network settings, defaulting to mainnet:', error)
            return 'mainnet'
        }
    }
})
