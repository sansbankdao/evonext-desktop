// src/stores/identity/actions/storage.ts
import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import type {
    IIdentityState,
    IIdentityData,
    IIdentityPublicKey,
    IPublicKey
} from '@/types'
interface Settings {
    network: 'mainnet' | 'testnet'
    [key: string]: any
}
// Helper functions
function validateIdentityData(data: any): data is IIdentityData {
    return data &&
        typeof data.username === 'string' &&
        typeof data.identity_id === 'string' &&
        typeof data.identity_idx === 'number' &&
        (data.balance === null || typeof data.balance === 'string')
}
function createDefaultIdentityData(): IIdentityData {
    return {
        username: '',
        identity_id: '',
        identity_idx: 0,
        balance: null,
        is_authenticated: false,
        public_keys: null,
        revision: null,
        created_at: null,
        public_key_ids: null
    }
}
export const storageActions = () => ({
    async saveToStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const network = await this.getCurrentNetwork()
            const identityId = state.identity?.id || ''
            const identityData: IIdentityData = {
                username: state.username || '',
                identity_id: identityId,
                identity_idx: state.identity?.identity_idx || 0,
                balance: state.balance,
                is_authenticated: state.isAuthenticated,
                public_keys: state.publicKeys.length > 0 ? state.publicKeys : null,
                revision: state.revision,
                created_at: state.lastConnected,
                public_key_ids: state.publicKeys.map((key: IIdentityPublicKey) => key.id || key.purpose || 0),
            }
            await invoke('save_identity_data', { network, payload: identityData })
            log('info', 'Identity data saved for network:', network)
        }, 'SAVE_IDENTITY_STORAGE_FAILED')
    },
    async loadFromStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const network = await this.getCurrentNetwork()
            const identityData = await invoke<IIdentityData | null>('load_identity_data', { network })
            if (identityData && validateIdentityData(identityData)) {
                log('info', 'Loaded identity data for network:', network, identityData)
                state.username = identityData.username || null
                state.balance = identityData.balance
                state.isAuthenticated = identityData.is_authenticated || false
                state.publicKeys = identityData.public_keys || []
                state.revision = identityData.revision
                state.lastConnected = identityData.created_at
                if (!state.identity && identityData.identity_id) {
                    state.identity = {
                        identity_idx: identityData.identity_idx || 0,
                        publicKeys: identityData.public_keys?.map(key => ({
                            type: key.type_ === 'ECDSA_HASH160' ? 2 : 0,
                            keyType: key.type_ || 'ECDSA_SECP256K1',
                            purpose: key.purpose,
                            securityLevel: key.security_level,
                            contractBounds: null,
                            data: key.data || '',
                            dataBytes: key.data_bytes || '',
                            readOnly: key.read_only,
                            disabledAt: key.disabled_at
                        } as IPublicKey)) || []
                    }
                }
            } else {
                log('info', 'No valid identity data found for network:', network)
                const defaultData = createDefaultIdentityData()
                await invoke('save_identity_data', { network, payload: defaultData })
                state.username = null
                state.identity = null
                state.balance = null
                state.balanceBigInt = undefined
                state.dashBigInt = undefined
                state.publicKeys = []
                state.revision = null
                state.isAuthenticated = false
                state.isConnecting = false
                state.connectionError = null
                state.premiumAccess = false
                state.lastConnected = null
            }
        }, 'LOAD_IDENTITY_STORAGE_FAILED')
    },
    async clearStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const network = await this.getCurrentNetwork()
            await Promise.all([
                invoke('delete_identity_data', { network }),
                invoke('delete_private_keys', { network }),
                invoke('delete_mnemonic', { network }),
                invoke('delete_assets', { network })
            ])
            log('info', 'All storage cleared for network:', network)
            state.username = null
            state.identity = null
            state.balance = null
            state.balanceBigInt = undefined
            state.dashBigInt = undefined
            state.publicKeys = []
            state.revision = null
            state.isAuthenticated = false
            state.isConnecting = false
            state.connectionError = null
            state.premiumAccess = false
            state.lastConnected = null
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
    async getIdentityFromStorage(this: any): Promise<IIdentityData | null> {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            const identityData = await invoke<IIdentityData>('load_identity_data', { network })
            if (identityData && validateIdentityData(identityData)) {
                return identityData
            }
            return null
        }, 'GET_IDENTITY_FROM_STORAGE_FAILED')
    },
    async updateBalanceInStorage(this: any, newBalance: string) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const network = await this.getCurrentNetwork()
            const identityData = await invoke<IIdentityData>('load_identity_data', { network })
            if (identityData && validateIdentityData(identityData)) {
                identityData.balance = newBalance
                await invoke('save_identity_data', { network, payload: identityData })
                state.balance = newBalance
                state.balanceBigInt = BigInt(newBalance)
                state.dashBigInt = state.balanceBigInt / BigInt(100_000_000_000)
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
