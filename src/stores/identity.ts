// src/stores/identity.ts

/* Import modules. */
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import initWasm, {
    WasmSdkBuilder,
    // identity_fetch,
    dpns_resolve_name,
    // get_dpns_usernames,
    // get_documents,
    // get_identity_token_balances,
    prefetch_trusted_quorums_mainnet,
} from '@/libs/dash/wasm_sdk.js'
import getIdentities from '@/libs/getIdentities' // Import getIdentities for WASM
// Import shared types to avoid redefinition and mismatches
import { IIdentity, IPublicKey } from '@/libs/types' // Adjust path if needed (matches getIdentities.ts import)
// Optional: If the returned publicKeys from getIdentities needs an extended type,
// define it here (includes base IPublicKey + computed fields from mapping)
export interface IExtendedPublicKey extends IPublicKey {
    keyType: string; // Computed from getKeyType(_key.type)
    dataBytes: string; // Computed from decodeBase64ToHex(_key.data)
}
export const useIdentityStore = defineStore('identity', {
    state: () => ({
        username: null as string | null,
        identity: null as IIdentity | null, // Now uses the shared/full IIdentity type
        isAuthenticated: false,
        isConnecting: false,
        connectionError: null as string | null,
        premiumAccess: false,
    }),
    actions: {
        async searchUserIdentities(network: 'mainnet' | 'testnet' = 'mainnet'): Promise<IIdentity | null> {
            try {
                // Initialize WASM if not already done
                await initWasm()
                // Search for identities derived from the saved mnemonic/keys
                const identities = await getIdentities(network === 'mainnet' ? 'mainnet' : 'testnet')
                if (!identities || identities.length === 0) {
                    console.warn('No identities found for the provided credentials.')
                    return null
                }
                // For simplicity, take the first identity found (assuming primary one from derivation index 0+)
                // In a real app, you might iterate and select based on additional criteria (e.g., active keys)
                const primaryIdentity = identities[0]
                console.log('Found identity:', primaryIdentity)
                // TODO: Optionally resolve DPNS name here if needed (using dpns_resolve_name from WASM)
                // For now, use the identity ID as the username fallback
                const username = primaryIdentity.id // Now safe: id is part of shared IIdentity
                // Update internal state
                this.username = username
                this.identity = primaryIdentity // Now matches the shared IIdentity type exactly
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
                /* Set payload. */
                const payload = { seed_phrase: seedPhrase }
                /* Save mnemonic (seed phrase). */
                await invoke('save_mnemonic', { payload })
                // After saving, search for existing identities derived from the mnemonic
                const identity = await this.searchUserIdentities(network)
                if (identity) {
                    this.isAuthenticated = true
                    this.login(this.username!) // Ensure username is set
                    console.log('Seed connection successful.')
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
                console.log(`Attempting to connect with private keys (username/ID + WIF or HEX).`)
                /* Set payload with all three keys (empty strings if not provided). Backend resolves username to ID if needed. */
                /* Backend should check: If username (e.g., "user.dash") → Use dpns_resolve_name; else treat as ID. */
                const payload = {
                    identity_id: identityId.trim(),
                    auth_key: authKey.trim(), // Authorization Key (WIF or HEX)
                    transfer_key: transferKey.trim(), // Transfer Key (WIF or HEX)
                    encryption_key: encryptionKey.trim() // Encryption Key (WIF or HEX)
                }
                /* Save private keys (backend handles username resolution, WIF decode or HEX). */
                await invoke('save_private_keys', { payload })
                // Optionally search for the identity to validate/load details (if keys allow derivation)
                // For direct keys, we can assume connection success and use provided ID
                const resolvedIdentityId = identityId.trim() // Backend should have resolved if username
                this.username = resolvedIdentityId
                this.isAuthenticated = true
                this.login(resolvedIdentityId)
                // If needed, search to load full identity details
                const identity = await this.searchUserIdentities(network)
                if (identity) {
                    this.identity = identity
                }
                console.log('Private keys connection successful.')
                return { success: true, identity: this.identity }
            } catch (err: any) {
                console.error('Private keys connection failed:', err)
                this.connectionError = typeof err === 'string' ? err : 'Failed to connect with private keys. Check formats (username.dash or ID; WIF or 64-char HEX).'
                return { success: false, error: this.connectionError }
            } finally {
                this.isConnecting = false
            }
        },
        login(username: string) {
            this.username = username
            this.isAuthenticated = true
        },
        logout() {
            this.username = null
            this.identity = null
            this.isAuthenticated = false
            this.premiumAccess = false
            this.connectionError = null
        },
        setPremiumAccess(hasAccess: boolean) {
            this.premiumAccess = hasAccess
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
