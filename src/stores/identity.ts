// src/stores/identity.ts
/* Import modules. */
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { DashPlatformSDK } from 'dash-platform-sdk'

import getIdentities from '@/libs/getIdentities'
import { getIdentityBalance } from '@evonext/platform'
import { IIdentity, IPublicKey } from '@/libs/types'

/* Interface definitions. */
export interface IExtendedPublicKey extends IPublicKey {
    keyType: string
    dataBytes: string
}
interface IdentityData {
    username: string
    identity_id: string
    balance: string | null
    is_authenticated: boolean
    public_keys: IdentityPublicKey[] | null
    revision: number | null
    created_at: string | null
    public_key_ids: number[] | null
}
interface IdentityPublicKey {
    id: number
    type_: string
    purpose: number
    security_level: number
    read_only: boolean
    disabled_at: string | null
}
export const useIdentityStore = defineStore('identity', {
    state: () => ({
        username: null as string | null,
        identity: null as IIdentity | null,
        balance: null as string | null,
        publicKeys: [] as IdentityPublicKey[],
        revision: null as number | null,
        isAuthenticated: false,
        isConnecting: false,
        connectionError: null as string | null,
        premiumAccess: false,
        lastConnected: null as string | null,
    }),
    actions: {
        async saveToStorage() {
            try {
                const identityData: IdentityData = {
                    username: this.username || '',
                    identity_id: this.identity?.id || '',
                    balance: this.balance,
                    is_authenticated: this.isAuthenticated,
                    public_keys: this.publicKeys.length > 0 ? this.publicKeys : null,
                    revision: this.revision,
                    created_at: this.lastConnected,
                    public_key_ids: this.publicKeys.map(key => key.id),
                }
                await invoke('save_identity_data', { payload: identityData })
                console.log('Identity data saved to storage')
            } catch (err) {
                console.error('Failed to save identity data to storage:', err)
            }
        },
        async loadFromStorage() {
            try {
                const identityData = await invoke('load_identity_data') as IdentityData | null
                if (identityData) {
                    console.log('Loaded identity data from storage:', identityData)
                    this.username = identityData.username || null
                    this.balance = identityData.balance
                    this.isAuthenticated = identityData.is_authenticated
                    this.publicKeys = identityData.public_keys || []
                    this.revision = identityData.revision
                    this.lastConnected = identityData.created_at
                }
            } catch (err) {
                console.error('Failed to load identity data from storage:', err)
            }
        },
        async updateIdentityWithSdkData(
            identityId: string,
            sdkPublicKeys: any[],
            sdkRevision: bigint | number
        ): Promise<void> {
            try {
                // Transform SDK public keys to our storage format - FIX: Added id and proper structure
                const publicKeys: IdentityPublicKey[] = sdkPublicKeys.map((key: any, index: number) => ({
                    id: index,
                    type_: key.type || 'ecdsa',
                    purpose: Number(key.purpose || 0),
                    security_level: Number(key.securityLevel || 0),
                    read_only: Boolean(key.readOnly || false),
                    disabled_at: key.disabledAt || null
                }))
                // Convert revision to number (handle bigint)
                const revisionNum = typeof sdkRevision === 'bigint' ? Number(sdkRevision) : sdkRevision
                await invoke('update_identity_with_sdk_data', {
                    identityId,
                    publicKeys,
                    revision: revisionNum,
                    publicKeyIds: publicKeys.map(key => key.id)
                })
                // Update local state
                this.publicKeys = publicKeys
                this.revision = revisionNum
                this.lastConnected = new Date().toISOString()
                console.log('Identity SDK data saved successfully')
            } catch (error) {
                console.error('Failed to update identity with SDK data:', error)
                throw error
            }
        },
        async initFromStorage() {
            try {
                await this.loadFromStorage()
                const [mnemonicData, keysData] = await Promise.all([
                    invoke('load_mnemonic').catch(() => null),
                    invoke('load_private_keys').catch(() => null)
                ])
                console.log('Loaded from storage - identity:', this.isAuthenticated, 'mnemonic:', !!mnemonicData, 'keys:', !!keysData)
                if (this.isAuthenticated && (mnemonicData || keysData)) {
                    console.log('Found stored identity and credentials, verifying state...')
                    await this.searchUserIdentities('mainnet')
                }
                else if (!this.isAuthenticated && (mnemonicData || keysData)) {
                    console.log('Found stored credentials but no identity, re-authenticating...')
                    if (mnemonicData) {
                        await this.connectWithSeed((mnemonicData as any).seed_phrase, 'mainnet')
                    } else if (keysData) {
                        const keys = keysData as any
                        await this.connectWithPrivateKeys(
                            keys.identity_id,
                            keys.auth_key,
                            keys.transfer_key,
                            keys.encryption_key,
                            'mainnet'
                        )
                    }
                }
            } catch (err) {
                console.error('Failed to initialize identity from storage:', err)
            }
        },
        async fetchBalance(): Promise<string | null> {
            console.log('fetchBalance called, identity:', this.identity?.id)
            if (!this.identity?.id) {
                console.log('No identity ID available for balance fetch')
                this.balance = null
                await this.saveToStorage()
                return null
            }
            try {
                console.log('Fetching balance for identity:', this.identity.id)
                const balance = await getIdentityBalance(this.identity.id)
                console.log('Balance result:', balance)
                this.balance = balance
                await this.saveToStorage()
                return balance
            } catch (err) {
                console.error('Failed to fetch identity balance:', err)
                this.balance = null
                await this.saveToStorage()
                return null
            }
        },
        async queryIdentityDetails(identityId: string): Promise<any> {
            try {
                console.log('Querying identity details for:', identityId)
                const sdk = new DashPlatformSDK({ network: 'mainnet' })
                const identity = await sdk.identities.getIdentityByIdentifier(identityId)
                console.log('SDK Identity details:', identity)
                const publicKeys = identity.getPublicKeys()
                const revision = identity.revision || 0n // Handle bigint
                console.log('Identity public keys:', publicKeys)
                console.log('Identity revision:', revision)
                // Save to storage including public keys
                await this.updateIdentityWithSdkData(identityId, publicKeys, revision)
                return {
                    identity,
                    publicKeys,
                    revision: Number(revision)
                }
            } catch (error) {
                console.error('Failed to query identity details:', error)
                throw error
            }
        },
        async searchUserIdentities(network: 'mainnet' | 'testnet' = 'mainnet'): Promise<IIdentity | null> {
            try {
                console.log('Searching for user identities...')
                const identities = await getIdentities(network === 'mainnet' ? 'mainnet' : 'testnet', false)
                console.log('Identities found:', identities)
                if (!identities || identities.length === 0) {
                    console.warn('No identities found for the provided credentials.')
                    return null
                }
                const primaryIdentity = identities[0]
                console.log('Primary identity:', primaryIdentity)
                const username = primaryIdentity.id
                this.username = username
                this.identity = primaryIdentity
                this.isAuthenticated = true
                // Query detailed identity information including public keys
                try {
                    await this.queryIdentityDetails(primaryIdentity.id)
                } catch (error) {
                    console.warn('Failed to query detailed identity information:', error)
                }
                await this.fetchBalance()
                await this.saveToStorage()
                return primaryIdentity
            } catch (err) {
                console.error('Failed to search for identities:', err)
                this.connectionError = 'Failed to search for existing identities. Please check your credentials.'
                return null
            }
        },
        async connectWithSeed(seedPhrase: string, network: 'mainnet' | 'testnet' = 'mainnet') {
            this.isConnecting = true
            this.connectionError = null
            try {
                console.log(`Attempting to connect with a mnemonic.`)
                const payload = { seed_phrase: seedPhrase }
                await invoke('save_mnemonic', { payload })
                const identity = await this.searchUserIdentities(network)
                if (identity) {
                    this.isAuthenticated = true
                    console.log('Seed connection successful. isAuthenticated:', this.isAuthenticated)
                    await this.saveToStorage()
                    return { success: true, identity }
                } else {
                    this.connectionError = 'No identity found for the provided seed phrase.'
                    return { success: false, error: this.connectionError }
                }
            } catch (err: any) {
                console.error('Seed connection failed:', err)
                this.connectionError = typeof err === 'string' ? err : 'Failed to connect with seed phrase.'
                return { success: false, error: this.connectionError }
            } finally {
                this.isConnecting = false
            }
        },
        async connectWithPrivateKeys(
            identityId: string,
            authKey: string,
            transferKey: string,
            encryptionKey: string,
            network: 'mainnet' | 'testnet' = 'mainnet'
        ) {
            this.isConnecting = true
            this.connectionError = null
            try {
                console.log(`Attempting to connect with private keys.`)
                const payload = {
                    identity_id: identityId.trim(),
                    auth_key: authKey.trim(),
                    transfer_key: transferKey.trim(),
                    encryption_key: encryptionKey.trim()
                }
                await invoke('save_private_keys', { payload })
                const resolvedIdentityId = identityId.trim()
                this.username = resolvedIdentityId
                this.isAuthenticated = true
                const identity = await this.searchUserIdentities(network)
                if (identity) {
                    this.identity = identity
                }
                console.log('Private keys connection successful. isAuthenticated:', this.isAuthenticated)
                await this.saveToStorage()
                return { success: true, identity: this.identity }
            } catch (err: any) {
                console.error('Private keys connection failed:', err)
                this.connectionError = typeof err === 'string' ? err : 'Failed to connect with private keys.'
                return { success: false, error: this.connectionError }
            } finally {
                this.isConnecting = false
            }
        },
        async getPublicKeys(): Promise<IdentityPublicKey[]> {
            try {
                if (this.publicKeys.length > 0) {
                    return this.publicKeys
                }
                if (this.identity?.id) {
                    const details = await this.queryIdentityDetails(this.identity.id)
                    return details.publicKeys || []
                }
                return []
            } catch (error) {
                console.error('Failed to get public keys:', error)
                return []
            }
        },
        login(username: string) {
            this.username = username
            this.isAuthenticated = true
            this.saveToStorage()
        },
        async logout() {
            try {
                await Promise.all([
                    invoke('save_mnemonic', { payload: { seed_phrase: '' } }).catch(() => {}),
                    invoke('save_private_keys', {
                        payload: {
                            identity_id: '',
                            auth_key: '',
                            transfer_key: '',
                            encryption_key: ''
                        }
                    }).catch(() => {}),
                    invoke('save_identity_data', {
                        payload: {
                            username: '',
                            identity_id: '',
                            balance: null,
                            is_authenticated: false,
                            public_keys: null,
                            revision: null,
                            created_at: null,
                            public_key_ids: null
                        }
                    }).catch(() => {})
                ])
            } catch (err) {
                console.error('Error clearing storage during logout:', err)
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
        },
        setPremiumAccess(hasAccess: boolean) {
            this.premiumAccess = hasAccess
            this.saveToStorage()
        },
        clearConnectionError() {
            this.connectionError = null
        },
    },
    getters: {
        getGreeting: (state) => `Hello, ${state.username || 'Guest'}!`,
        isConnected: (state) => state.isAuthenticated && !!state.username,
        hasPublicKeys: (state) => state.publicKeys.length > 0,
        getPublicKeyById: (state) => (id: number) => {
            return state.publicKeys.find(key => key.id === id)
        },
        getAuthPublicKey: (state) => {
            return state.publicKeys.find(key => key.purpose === 0)
        },
        getEncryptionPublicKey: (state) => {
            return state.publicKeys.find(key => key.purpose === 1)
        },
    },
})
