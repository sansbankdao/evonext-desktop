// src/stores/identity/actions/storage.ts - COMPLETE FILE
import { invoke } from '@tauri-apps/api/core'
import { type IIdentityState, type RustDiscoveredIdentitiesStore, type DiscoveredIdentity } from '@/types'
import { log } from '@/utils/env'
// ===== STORAGE ACTIONS FOR PERSISTENCE =====
export const storageActions = () => ({
    async saveToStorage(this: IIdentityState, networkOverride?: 'mainnet' | 'testnet') {
        try {
            const network = networkOverride || await this.getCurrentNetwork()
            if (!this.identity) {
                log('warn', '[Storage] No active identity to save')
                return
            }
            // 1. Save basic identity data
            const identityData = {
                username: this.username || this.identityId || '',
                identity_id: this.identityId || this.identity.identityId || '',
                identity_idx: this.identity.identityIdx || 0,
                balance: this.balance?.toString() || null,
                is_authenticated: this.isAuthenticated,
                public_keys: this.publicKeys || [],
                revision: this.revision || 0,
                created_at: new Date().toISOString(),
                public_key_ids: this.identity.publicKeys?.map(pk => pk.id || 0) || []
            }
            await invoke('save_identity_data', {
                network,
                payload: identityData
            })
            log('info', `[Storage] Identity data saved for ${this.identityId} on ${network}`)
        } catch (err: any) {
            log('error', '[Storage] Failed to save identity data:', err)
        }
    },
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
                    dpnsUsername: data.dpns_username || null
                }
                this.balance = data.balance || null
                this.revision = data.revision || null
                this.isAuthenticated = data.is_authenticated || false
                this.publicKeys = data.public_keys || []
            }
            log('info', `[Storage] Identity data loaded${data ? '' : ' (none found)'} for ${network}`)
        } catch (err: any) {
            log('error', '[Storage] Failed to load identity data:', err)
        }
    },
    async clearStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            await Promise.all([
                invoke('delete_identity_data', { network }),
                invoke('delete_private_keys', { network }),
                invoke('delete_mnemonic', { network }),
                invoke('clear_discovered_identities', { network })
            ])
            this.username = null
            this.identityId = null
            this.identity = null
            this.balance = null
            this.revision = null
            this.isAuthenticated = false
            this.publicKeys = []
            log('info', '[Storage] All storage cleared')
        } catch (err: any) {
            log('error', '[Storage] Failed to clear storage:', err)
        }
    },
    async getCurrentNetwork(this: IIdentityState): Promise<'mainnet' | 'testnet'> {
        try {
            const settings = await invoke<any>('load_settings')
            return settings?.network === 'testnet' ? 'testnet' : 'mainnet'
        } catch {
            return 'mainnet'
        }
    },
    // ===== NEW: DISCOVERED IDENTITIES STORAGE =====
    async saveDiscoveredIdentities(
        this: IIdentityState,
        identities: DiscoveredIdentity[],
        network: 'mainnet' | 'testnet',
        keyType: 'seed' | 'private'
    ): Promise<{ success: boolean; savedCount: number; error?: string }> {
        try {
            log('info', `[Storage] Saving ${identities.length} discovered ${keyType} identities to Rust...`)
            // Filter out identities without ID
            const validIdentities = identities.filter(id => id.identityId && id.identityId.trim().length > 0)
            if (validIdentities.length === 0) {
                log('warn', '[Storage] No valid identities to save')
                return { success: false, savedCount: 0, error: 'No valid identities to save' }
            }
            // Transform TypeScript DiscoveredIdentity to Rust DiscoveredIdentity
            const rustIdentities = validIdentities.map(identity => ({
                identity_id: identity.identityId,
                identity_idx: identity.identityIdx || 0,
                dpns_username: identity.dpnsUsername || null,
                balance: identity.balance ? String(identity.balance) : null,
                key_type: keyType,
                discovered_key: null, // Seed/store derived via save_private_keys in SeedDiscovery
                discovered_at: new Date().toISOString()
            }))
            log('debug', '[Storage] Converted identities:', rustIdentities.map(id => ({
                idx: id.identity_idx,
                dpns: id.dpns_username
            })))
            const result = await invoke<number>('save_discovered_identities', {
                network,
                discoveredIdentities: rustIdentities
            })
            log('info', `[Storage] Successfully saved ${result} discovered identities to Rust storage`)
            return {
                success: true,
                savedCount: result
            }
        } catch (err: any) {
            log('error', '[Storage] Failed to save discovered identities:', err)
            return {
                success: false,
                savedCount: 0,
                error: err.message || 'Failed to save discovered identities to Rust storage'
            }
        }
    },
    async loadDiscoveredIdentities(
        this: IIdentityState,
        network: 'mainnet' | 'testnet'
    ): Promise<RustDiscoveredIdentitiesStore | null> {
        try {
            log('info', `[Storage] Loading discovered identities from Rust for network: ${network}`)
            const result = await invoke<RustDiscoveredIdentitiesStore | null>('load_discovered_identities', { network })
            if (result) {
                log('info', `[Storage] Loaded ${Object.keys(result.identities).length} discovered identities`)
            } else {
                log('info', '[Storage] No discovered identities found')
            }
            return result
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
            log('info', `[Storage] Clearing discovered identities for network: ${network}`)
            await invoke('clear_discovered_identities', { network })
            log('info', '[Storage] Discovered identities cleared')
            return { success: true }
        } catch (err: any) {
            log('error', '[Storage] Failed to clear discovered identities:', err)
            return {
                success: false,
                error: err.message || 'Failed to clear discovered identities'
            }
        }
    }
})
