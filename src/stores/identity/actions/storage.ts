// src/stores/identity/actions/storage.ts

import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import type {
    IIdentityState,
    IIdentity,
    IPublicKey
} from '@/types'

interface Settings {
    network: 'mainnet' | 'testnet'
    [key: string]: any
}

// Helper functions
function validateIdentityData(data: any): data is IIdentity {
    return data &&
        typeof data.username === 'string' &&
        typeof data.identityId === 'string' &&
        typeof data.identityIdx === 'number' &&
        (data.balance === null || typeof data.balance === 'string')
}

function createDefaultIdentityData(): IIdentity {
    return {
        id: '',
        identityId: '',
        identityIdx: 0,

        balance: 0,
        revision: 0,
        publicKeys: [],

        username: '',
        // TODO Add all available fields.
        publicKeyIds: [],
        isAuthenticated: false,
        createdAt: 1234567890,
    }
}

export const storageActions = () => ({
    async saveToStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const network = await this.getCurrentNetwork()
            const identityId = state.identity?.id || ''
            const identityData: IIdentity = {
                username: state.username || '',
                identityId: identityId,
                identityIdx: state.identity?.identityIdx || 0,
                balance: state.balance,
                isAuthenticated: state.isAuthenticated,
                publicKeys: state.publicKeys.length > 0 ? state.publicKeys : [],
                revision: state.revision || 0,
                createdAt: state.lastConnected!,
                publicKeyIds: state.publicKeys.map((key: IPublicKey) => key.type || 0),
            }

            await invoke('save_identity_data', { network, payload: identityData })
            log('info', 'Identity data saved for network:', network)
        }, 'SAVE_IDENTITY_STORAGE_FAILED')
    },

    async loadFromStorage(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            const network = await this.getCurrentNetwork()
            const identityData = await invoke<IIdentity | null>('load_identity_data', { network })

            if (identityData && validateIdentityData(identityData)) {
                log('info', 'Loaded identity data for network:', network, identityData)
                state.username = identityData.username || null
                state.balance = identityData.balance?.toString() || '0'
                state.isAuthenticated = identityData.isAuthenticated || false
                state.publicKeys = identityData.publicKeys || []
                state.revision = Number(identityData.revision) || 0
                state.lastConnected = identityData.createdAt!

                if (!state.identity && identityData.identityId) {
                    state.identity = {
                        identityId: identityData.identityId,
                        identityIdx: identityData.identityIdx || 0,
                        balance: identityData.balance || '',
                        revision: Number(identityData.revision) || 0,
                        publicKeys: identityData.publicKeys?.map(key => ({
                            type: key.type,
                            keyType: key.keyType || 'ECDSA_SECP256K1',
                            purpose: key.purpose,
                            securityLevel: key.securityLevel,
                            contractBounds: null,
                            data: key.data || '',
                            dataBytes: key.dataBytes || '',
                            readOnly: key.readOnly,
                            disabledAt: key.disabledAt
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
                // state.balanceBigInt = undefined
                // state.dashBigInt = undefined
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
            // state.balanceBigInt = undefined
            // state.dashBigInt = undefined
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
alert('SAVING MNEMONIC')
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            await invoke('save_mnemonic', { network, payload: mnemonic })
        }, 'SAVE_MNEMONIC_FAILED')
    },

    async getIdentityFromStorage(this: any): Promise<IIdentity | null> {
        return ErrorBoundary.wrap(async () => {
            const network = await this.getCurrentNetwork()
            const identityData = await invoke<IIdentity>('load_identity_data', { network })

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
            const identityData = await invoke<IIdentity>('load_identity_data', { network })

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
