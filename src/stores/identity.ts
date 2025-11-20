// src/stores/identity.ts

/* Import modules. */
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
// import initWasm, {
//     WasmSdkBuilder,
//     dpns_resolve_name,
//     prefetch_trusted_quorums_mainnet,
// } from '@/libs/dash/wasm_sdk.js'
import getIdentities from '@/libs/getIdentities'
import { getIdentityBalance } from '@evonext/platform'
import { IIdentity, IPublicKey } from '@/libs/types'

export interface IExtendedPublicKey extends IPublicKey {
    keyType: string;
    dataBytes: string;
}

interface IdentityData {
    username: string;
    identity_id: string;
    balance: string | null;
    is_authenticated: boolean;
}

export const useIdentityStore = defineStore('identity', {
    state: () => ({
        username: null as string | null,
        identity: null as IIdentity | null,
        balance: null as string | null,
        isAuthenticated: false,
        isConnecting: false,
        connectionError: null as string | null,
        premiumAccess: false,
    }),

    actions: {
        async saveToStorage() {
            try {
                const identityData: IdentityData = {
                    username: this.username || '',
                    identity_id: this.identity?.id || '',
                    balance: this.balance,
                    is_authenticated: this.isAuthenticated,
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

                    // Note: We don't restore the full identity object from storage
                    // as it contains complex nested data. Instead, we'll re-fetch it
                    // if needed using the stored identity_id
                }
            } catch (err) {
                console.error('Failed to load identity data from storage:', err)
            }
        },

        async initFromStorage() {
            try {
                // Load identity state from storage
                await this.loadFromStorage()

                const [mnemonicData, keysData] = await Promise.all([
                    invoke('load_mnemonic').catch(() => null),
                    invoke('load_private_keys').catch(() => null)
                ])

                console.log('Loaded from storage - identity:', this.isAuthenticated, 'mnemonic:', !!mnemonicData, 'keys:', !!keysData)

                // If we have stored identity data and credentials, ensure everything is in sync
                if (this.isAuthenticated && (mnemonicData || keysData)) {
                    console.log('Found stored identity and credentials, verifying state...')
                    // Refresh the identity data to ensure it's current
                    await this.searchUserIdentities('mainnet')
                }
                // If we have credentials but no stored identity, try to re-authenticate
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

                // Fetch balance after setting identity
                await this.fetchBalance()
                // Save to storage after successful identity resolution
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

        login(username: string) {
            this.username = username
            this.isAuthenticated = true
            this.saveToStorage()
        },

        async logout() {
            // Clear all storage
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
                            is_authenticated: false
                        }
                    }).catch(() => {})
                ])
            } catch (err) {
                console.error('Error clearing storage during logout:', err)
            }

            // Clear local state
            this.username = null
            this.identity = null
            this.balance = null
            this.isAuthenticated = false
            this.premiumAccess = false
            this.connectionError = null
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
    },
})
