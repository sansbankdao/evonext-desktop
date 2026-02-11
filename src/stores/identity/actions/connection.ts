// src/stores/identity/actions/connection.ts

import { invoke } from '@/utils/tauri'
import type {
    IIdentityState,
    ConnectionResult,
    IPublicKey,
    PurposeType,
    SecurityLevelType
} from '@/types/identity'
import { transformPublicKeys, validateIdentityData } from '../utils'

export const connectionActions = {
    /**
     * Connects using a 12/24 word seed phrase
     */
    async connectWithSeed(
        this: IIdentityState,
        seedPhrase: string,
        network: 'mainnet' | 'testnet',
        identityId: string,
        identityIndex: number
    ): Promise<ConnectionResult> {
        this.isConnecting = true
        this.connectionError = null
        try {
            const identityData = await invoke<any>('get_identity_details', {
                identityId,
                idx: identityIndex
            })

            const mappedPublicKeys = transformPublicKeys(identityData.publicKeys || [])

            await invoke('save_identity_data', {
                network,
                identityId,
                identityIdx: identityIndex,
                publicKeys: mappedPublicKeys,
                balance: identityData.balance,
                username: identityData.username
            })

            this.identityId = identityId
            this.identityIdx = identityIndex
            this.publicKeys = mappedPublicKeys
            this.balance = identityData.balance
            this.isConnected = true
            this.isAuthenticated = true

            await this.saveToStorage()
            return { success: true, identityId }
        } catch (e) {
            this.connectionError = String(e)
            return { success: false, error: String(e) }
        } finally {
            this.isConnecting = false
        }
    },

    /**
     * Connects using a single private key (WIF or Hex)
     */
    async connectWithPrivateKey(
        this: IIdentityState,
        privateKey: string,
        identityId: string,
        network: 'mainnet' | 'testnet'
    ): Promise<ConnectionResult> {
        this.isConnecting = true
        try {
            const result = await invoke<any>('connect_single_key', {
                privateKey,
                identityId,
                network
            })
            if (result) {
                this.identityId = identityId
                this.isConnected = true
                await this.refreshIdentity()
                return { success: true, identityId }
            }
            return { success: false, error: 'Connection failed' }
        } catch (e) {
            return { success: false, error: String(e) }
        } finally {
            this.isConnecting = false
        }
    },

    /**
     * Restores state from local storage
     */
    async loadFromStorage(this: IIdentityState) {
        try {
            const data = await invoke<any>('load_identity_store')
            if (data && validateIdentityData(data)) {
                this.identityId = data.identityId
                this.identities = data.identities || {}
                this.isConnected = !!this.identityId
            }
        } catch (e) {
            console.warn('[ConnectionStore] No local storage found')
        }
    },

    /**
     * Persists current state to local storage
     */
    async saveToStorage(this: IIdentityState) {
        try {
            await invoke('save_identity_store', {
                identityId: this.identityId,
                identities: this.identities
            })
        } catch (e) {
            console.error('[ConnectionStore] Save failed:', e)
        }
    },

    /**
     * Wipes all local identity data
     */
    async clearStorage(this: IIdentityState) {
        this.identityId = null
        this.identities = {}
        this.isConnected = false
        this.isAuthenticated = false
        await invoke('clear_identity_store')
    },

    /**
     * Clears connection-related errors for the UI
     */
    clearConnectionError(this: IIdentityState) {
        this.connectionError = null
    }
}
