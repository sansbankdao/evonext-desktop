// src/stores/identity/actions/connection.ts

import { invoke } from '@tauri-apps/api/core'  // Tauri v2
import getIdentities from '@/libs/getIdentities'
import type { State } from '../types'

export const connectionActions = (state: State, store: any) => ({
    async initFromStorage() {
        try {
            await store.loadFromStorage()
            const [mnemonicData, keysData] = await Promise.all([
                invoke('load_mnemonic').catch(() => null),  // ✅ Tauri v2
                invoke('load_private_keys').catch(() => null),  // ✅ Tauri v2
            ])
            console.log('Loaded from storage - identity:', state.isAuthenticated, 'mnemonic:', !!mnemonicData, 'keys:', !!keysData)
            if (state.isAuthenticated && (mnemonicData || keysData)) {
                console.log('Found stored identity and credentials, verifying state...')
                await store.searchUserIdentities('mainnet')
            }
            else if (!state.isAuthenticated && (mnemonicData || keysData)) {
                console.log('Found stored credentials but no identity, re-authenticating...')
                if (mnemonicData) {
                    await store.connectWithSeed((mnemonicData as any).seed_phrase, 'mainnet')
                } else if (keysData) {
                    const keys = keysData as any
                    await store.connectWithPrivateKeys(
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

    async connectWithSeed(seedPhrase: string, network: 'mainnet' | 'testnet' = 'mainnet') {
        state.isConnecting = true
        state.connectionError = null
        try {
            console.log(`Attempting to connect with a mnemonic.`)
            const payload = { seed_phrase: seedPhrase }
            await invoke('save_mnemonic', { payload })  // ✅ Tauri v2
            const identity = await store.searchUserIdentities(network)
            if (identity) {
                state.isAuthenticated = true
                console.log('Seed connection successful. isAuthenticated:', state.isAuthenticated)
                await store.saveToStorage()
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

    async connectWithPrivateKeys(
        identityId: string,
        authKey: string,
        transferKey: string,
        encryptionKey: string,
        network: 'mainnet' | 'testnet' = 'mainnet'
    ) {
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
            await invoke('save_private_keys', { payload })  // ✅ Tauri v2
            const resolvedIdentityId = identityId.trim()
            state.username = resolvedIdentityId
            state.isAuthenticated = true
            const identity = await store.searchUserIdentities(network)
            if (identity) {
                state.identity = identity
            }
            console.log('Private keys connection successful. isAuthenticated:', state.isAuthenticated)
            await store.saveToStorage()
            return { success: true, identity: state.identity }
        } catch (err: any) {
            console.error('Private keys connection failed:', err)
            state.connectionError = typeof err === 'string' ? err : 'Failed to connect with private keys.'
            return { success: false, error: state.connectionError }
        } finally {
            state.isConnecting = false
        }
    },

    login(username: string) {
        state.username = username
        state.isAuthenticated = true
        store.saveToStorage()
    },

    async logout() {
        try {
            await Promise.all([
                invoke('save_mnemonic', { payload: { seed_phrase: '' } }).catch(() => {}),  // ✅ Tauri v2
                invoke('save_private_keys', {  // ✅ Tauri v2
                    payload: {
                        identity_id: '',
                        auth_key: '',
                        transfer_key: '',
                        encryption_key: ''
                    }
                }).catch(() => {}),
                invoke('save_identity_data', {  // ✅ Tauri v2
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

    setPremiumAccess(hasAccess: boolean) {
        state.premiumAccess = hasAccess
        store.saveToStorage()
    },

    clearConnectionError() {
        state.connectionError = null
    },
})
