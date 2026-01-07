// src/stores/identity/actions/storage.ts

import { invoke } from '@tauri-apps/api/core'
import { type IIdentityState, type RustDiscoveredIdentitiesStore, type DiscoveredIdentity } from '@/types'
import { log } from '@/utils/env'

export const storageActions = () => ({
    // --- Main Persistence Methods ---
    /**
     * Helper to save identity object (non-keys) to Rust storage
     */
    async saveIdentityDataToStore(
        this: IIdentityState,
        network: 'mainnet' | 'testnet',
        targetId: string,
        data: any
    ): Promise<void> {
        try {
            const payload = {
                username: data.username || targetId,
                identity_id: targetId,
                identity_idx: data.identity_idx || 0,
                balance: data.balance ? String(data.balance) : null,
                is_authenticated: true,
                public_keys: data.public_keys || [],
                revision: typeof data.revision === 'string'
                    ? Number(data.revision) || 0
                    : (data.revision || 0),
                created_at: new Date().toISOString(),
                public_key_ids: (data.public_keys || []).map((pk: any) => pk.id || 0)
            }
            await invoke('save_identity_data_untyped', { network, payload })
            log('info', `[Storage] Identity data saved for ${targetId} on ${network}`)
        } catch (err: any) {
            log('error', '[Storage] Failed to save identity data:', err)
            throw new Error('Failed to save identity data')
        }
    },
    /**
     * Save private keys to Rust storage
     */
    async saveKeys(
        this: IIdentityState,
        network: 'mainnet' | 'testnet',
        targetId: string,
        keys: any[]
    ): Promise<void> {
        try {
            // Backend handles duplicates gracefully, but we prevent empty arrays
            if (!keys || keys.length === 0) return
            await invoke('save_private_keys', {
                network,
                identityId: targetId,
                keys: keys
            })
            log('info', `[Storage] Keys saved for ${targetId} on ${network}`)
        } catch (err: any) {
            log('error', '[Storage] Failed to save keys:', err)
            throw new Error('Failed to save keys')
        }
    },
    /**
     * Saves current store state to persistent storage
     */
    async saveToStorage(this: IIdentityState, networkOverride?: 'mainnet' | 'testnet') {
        try {
            const network = networkOverride || await this.getCurrentNetwork()
            if (this.identity && this.identityId) {
                await this.saveIdentityDataToStore(
                    network,
                    this.identityId,
                    this.identity
                )
            }
        } catch (err) {
            console.error('[Storage] saveToStorage failed', err)
        }
    },
    /**
     * Loads identity state from persistent storage
     */
    async loadFromStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            const data = await invoke<any>('load_identity_data', { network })
            if (data) {
                this.username = data.username || null
                this.identityId = data.identity_id || null
                this.identity = {
                    identityId: data.identity_id || '',
                    identityIdx: data.identity_idx || 0,
                    balance: data.balance || '0',
                    revision: data.revision || 0,
                    publicKeys: data.public_keys || [],
                    // FIX: IIdentity does not have dpnsUsername. Map to username or omit.
                    username: data.dpns_username || data.username || undefined
                }
                this.balance = data.balance || null
                this.revision = data.revision || null
                this.isAuthenticated = data.is_authenticated || false
                this.publicKeys = data.public_keys || []
                log('info', `[Storage] Identity data loaded for ${network}`)
            } else {
                log('info', `[Storage] No identity data found for ${network}`)
            }
        } catch (err: any) {
            log('error', '[Storage] Failed to load identity data:', err)
        }
    },
    /**
     * Clears all storage for the current context (or everything if not logged in)
     */
    async clearStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            // Delete current identity specific data
            await invoke('delete_private_keys', { network, identityId: this.identityId || '' })
            await invoke('delete_identity_data', { network, identityId: this.identityId || '' })
            // If we are doing a full reset/logout, we might want to clear global items too
            await invoke('delete_mnemonic', { network })
            await invoke('clear_discovered_identities', { network })
            this.username = null
            this.identityId = null
            this.identity = null
            this.balance = null
            this.revision = null
            this.isAuthenticated = false
            this.publicKeys = []
            log('info', '[Storage] Storage cleared')
        } catch (err: any) {
            log('error', '[Storage] Failed to clear storage:', err)
        }
    },
    // --- Helper Methods ---
    async saveMnemonicToStore(
        this: IIdentityState,
        network: 'mainnet' | 'testnet',
        seedPhrase: string
    ): Promise<void> {
        try {
            await invoke('save_mnemonic', {
                network,
                payload: { seedPhrase }
            })
        } catch (err: any) {
            console.error('[Storage] Failed to save mnemonic:', err)
        }
    },
    async loadMnemonic(
        this: IIdentityState,
        network: 'mainnet' | 'testnet'
    ): Promise<{ seedPhrase: string } | null> {
        try {
            return await invoke<{ seedPhrase: string } | null>('load_mnemonic', { network })
        } catch (err) {
            // It's possible mnemonic doesn't exist
            return null
        }
    },
    async loadSettings(this: IIdentityState): Promise<any> {
        try {
            return await invoke('load_settings')
        } catch {
            return null
        }
    },
    async getCurrentNetwork(this: IIdentityState): Promise<'mainnet' | 'testnet'> {
        try {
            const settings = await this.loadSettings()
            return settings?.network === 'testnet' ? 'testnet' : 'mainnet'
        } catch {
            return 'mainnet'
        }
    },
    // ===== DISCOVERED IDENTITIES STORAGE =====
    async saveDiscoveredIdentities(
        this: IIdentityState,
        identities: DiscoveredIdentity[],
        network: 'mainnet' | 'testnet',
        keyType: 'seed' | 'private'
    ): Promise<{ success: boolean; savedCount: number; error?: string }> {
        try {
            log('info', `[Storage] Saving ${identities.length} discovered ${keyType} identities...`)
            const validIdentities = identities.filter(id => id.identityId && id.identityId.trim().length > 0)
            if (validIdentities.length === 0) {
                return { success: false, savedCount: 0, error: 'No valid identities to save' }
            }
            const rustIdentities = validIdentities.map(identity => ({
                identity_id: identity.identityId,
                identity_idx: identity.identityIdx || 0,
                dpns_username: identity.dpnsUsername || null,
                balance: identity.balance ? String(identity.balance) : null,
                key_type: keyType,
                discovered_key: null,
                discovered_at: new Date().toISOString()
            }))
            const result = await invoke<number>('save_discovered_identities', {
                network,
                discoveredIdentities: rustIdentities
            })
            return { success: true, savedCount: result }
        } catch (err: any) {
            log('error', '[Storage] Failed to save discovered identities:', err)
            return {
                success: false,
                savedCount: 0,
                error: err.message || 'Failed to save discovered identities'
            }
        }
    },
    async loadDiscoveredIdentities(
        this: IIdentityState,
        network: 'mainnet' | 'testnet'
    ): Promise<RustDiscoveredIdentitiesStore | null> {
        try {
            return await invoke<RustDiscoveredIdentitiesStore | null>('load_discovered_identities', { network })
        } catch (err: any) {
            log('error', '[Storage] Failed to load discovered identities:', err)
            return null
        }
    },
    async clearDiscoveredIdentities(
        this: IIdentityState,
        network: 'mainnet' | 'testnet'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            await invoke('clear_discovered_identities', { network })
            return { success: true }
        } catch (err: any) {
            return { success: false, error: err.message }
        }
    }
})

export function identitiesMapActions() {
    return {
        async loadAllIdentities(this: any, network: 'mainnet' | 'testnet') {
            try {
                const map = await invoke<Record<string, any>>('load_identities_map', { network })
                this.identitiesMap = map
                return map
            } catch (e) {
                return {}
            }
        }
    }
}
