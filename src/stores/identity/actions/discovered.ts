// src/stores/identity/actions/discovered.ts - NEW FILE
import { invoke } from '@/utils/tauri'
import type { IIdentityState, DiscoveredIdentity, RustDiscoveredIdentitiesStore } from '@/types'
import { log } from '@/utils/env'

export const discoveredIdentitiesActions = () => ({
    async saveDiscoveredIdentities(
        this: IIdentityState,
        identities: DiscoveredIdentity[],
        network: 'mainnet' | 'testnet',
        keyType: 'seed' | 'private'
    ): Promise<{ success: boolean; savedCount: number; error?: string }> {
        try {
            log('info', `[Store] Saving ${identities.length} discovered ${keyType} identities to Rust...`)

            // Filter out identities without ID
            const validIdentities = identities.filter(id => id.identityId && id.identityId.trim().length > 0)
            if (validIdentities.length === 0) {
                log('warn', '[Store] No valid identities to save')
                return { success: false, savedCount: 0, error: 'No valid identities to save' }
            }

            // Transform TypeScript DiscoveredIdentity to Rust DiscoveredIdentity
            const rustIdentities = validIdentities.map(identity => ({
                identity_id: identity.identityId,
                identity_idx: identity.identityIdx || 0,
                dpns_username: identity.dpnsUsername || null,
                balance: identity.balance ? String(identity.balance) : null,
                key_type: keyType,
                discovered_key: null, // We don't store the seed/private key here - only in keystore
                discovered_at: new Date().toISOString()
            }))

            log('debug', '[Store] Converted identities:', rustIdentities.map(id => ({
                idx: id.identity_idx,
                dpns: id.dpns_username
            })))

            const result = await invoke<number>('save_discovered_identities', {
                network,
                discoveredIdentities: rustIdentities
            })

            log('info', `[Store] Successfully saved ${result} discovered identities to Rust storage`)

            return {
                success: true,
                savedCount: result
            }
        } catch (err: any) {
            log('error', '[Store] Failed to save discovered identities:', err)
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
            log('info', `[Store] Loading discovered identities from Rust for network: ${network}`)

            const result = await invoke<RustDiscoveredIdentitiesStore | null>('load_discovered_identities', { network })

            if (result) {
                log('info', `[Store] Loaded ${Object.keys(result.identities).length} discovered identities`)
            } else {
                log('info', '[Store] No discovered identities found')
            }

            return result
        } catch (err: any) {
            log('error', '[Store] Failed to load discovered identities:', err)
            return null
        }
    },

    async clearDiscoveredIdentities(
        this: IIdentityState,
        network: 'mainnet' | 'testnet'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            log('info', `[Store] Clearing discovered identities for network: ${network}`)

            await invoke('clear_discovered_identities', { network })

            log('info', '[Store] Discovered identities cleared')
            return { success: true }
        } catch (err: any) {
            log('error', '[Store] Failed to clear discovered identities:', err)
            return {
                success: false,
                error: err.message || 'Failed to clear discovered identities'
            }
        }
    }
})
