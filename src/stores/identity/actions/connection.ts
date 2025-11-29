// src/stores/identity/actions/connection.ts

/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
// import getIdentities from '@/libs/getIdentities'
import type { State } from '../types'

export const connectionActions = () => ({
    async initFromStorage(this: any) {
        const state = this as State

        try {
            await this.loadFromStorage()

            const [mnemonicData, keysData] = await Promise.all([
                invoke('load_mnemonic').catch(() => null),
                invoke('load_private_keys').catch(() => null)
            ])

            console.log('Loaded from storage - identity:', state.isAuthenticated, 'mnemonic:', !!mnemonicData, 'keys:', !!keysData)

            if (state.isAuthenticated && (mnemonicData || keysData)) {
                console.log('Found stored identity and credentials, verifying state...')
                await this.searchUserIdentities('mainnet')
            } else if (!state.isAuthenticated && (mnemonicData || keysData)) {
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

    async connectWithSeed(this: any, seedPhrase: string, network: 'mainnet' | 'testnet' = 'mainnet') {
        const state = this as State
        state.isConnecting = true
        state.connectionError = null

        try {
            console.log(`Attempting to connect with a mnemonic.`)

            const payload = { seed_phrase: seedPhrase }
            await invoke('save_mnemonic', { payload })

            const identity = await this.searchUserIdentities(network)

            if (identity) {
                state.isAuthenticated = true

                console.log('Seed connection successful. isAuthenticated:', state.isAuthenticated)

                await this.saveToStorage()

                return { success: true, identity }
            } else {
                state.connectionError = 'No identity found for the provided seed phrase.'

                return { success: false, error: state.connectionError }
            }
        } catch (err: any) {
            console.error('Seed connection failed:', err)
            state.connectionError = typeof err === 'string' ? err : 'Failed to connect with seed phrase.'

            return { success: false, error: state.connectionError }
        } finally {
            state.isConnecting = false
        }
    },

    async connectWithPrivateKeys(this: any, identityId: string, authKey: string, transferKey: string, encryptionKey: string, network: 'mainnet' | 'testnet' = 'mainnet') {
        const state = this as State
        state.isConnecting = true
        state.connectionError = null

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
            state.username = resolvedIdentityId
            state.isAuthenticated = true

            const identity = await this.searchUserIdentities(network)

            if (identity) {
                state.identity = identity
            }
            console.log('Private keys connection successful. isAuthenticated:', state.isAuthenticated)
            await this.saveToStorage()
            return { success: true, identity: state.identity }
        } catch (err: any) {
            console.error('Private keys connection failed:', err)
            state.connectionError = typeof err === 'string' ? err : 'Failed to connect with private keys.'
            return { success: false, error: state.connectionError }
        } finally {
            state.isConnecting = false
        }
    },

    login(this: any, username: string) {
        const state = this as State
        state.username = username
        state.isAuthenticated = true
        this.saveToStorage()
    },

    async logout(this: any) {
        const state = this as State

        try {
            await Promise.all([
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
                }).catch(() => {}),
                invoke('save_license', { payload: { license_id: '' } }).catch(() => {}),
                invoke('save_mnemonic', { payload: { seed_phrase: '' } }).catch(() => {}),
                invoke('save_private_keys', {
                    payload: {
                        identity_id: '',
                        auth_key: '',
                        transfer_key: '',
                        encryption_key: ''
                    }
                }).catch(() => {})
            ])
        } catch (err) {
            console.error('Error clearing storage during logout:', err)
        }
        state.username = null
        state.identity = null
        state.balance = null
        state.publicKeys = []
        state.revision = null
        state.isAuthenticated = false
        state.premiumAccess = false
        state.connectionError = null
        state.lastConnected = null
    },

    setPremiumAccess(this: any, hasAccess: boolean) {
        const state = this as State
        state.premiumAccess = hasAccess
        this.saveToStorage()
    },

    clearConnectionError(this: any) {
        const state = this as State
        state.connectionError = null
    },
})
