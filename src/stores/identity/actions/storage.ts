// src/stores/identity/action/storage.ts

import { invoke } from '@tauri-apps/api/core'
import {
    type IIdentityState,
    type RustDiscoveredIdentitiesStore,
    type DiscoveredIdentity
} from '@/types'
import { debugLogger } from '@/utils/debugLogger'

export const storageActions = () => ({
    /**
     * Save identity (non-private-keys) to Rust storage.
     */
    async saveIdentityDataToStore(
        this: IIdentityState,
        network: 'mainnet' | 'testnet',
        targetId: string,
        data: any
    ): Promise<void> {
        // Prevent saving undefined/null IDs which causes backend corruption
        if (!targetId || targetId === 'undefined' || targetId === 'null') {
            debugLogger.log(`[Storage] ❌ Aborting save: Invalid targetId provided.`, 'error')
            return
        }
        const fullIdentityObject = {
            identityId: targetId,
            identity_id: targetId,
            identityIdx: data.identityIdx ?? data.identity_idx ?? 0,
            identity_idx: data.identityIdx ?? data.identity_idx ?? 0,
            username: data.username ?? this.username ?? targetId,
            dpnsUsername: data.dpnsUsername ?? null,
            balance: (typeof data.balance === 'bigint' || (typeof data.balance === 'number' && data.balance > Number.MAX_SAFE_INTEGER))
                ? data.balance.toString()
                : String(data.balance ?? '0'),
            revision: (typeof data.revision === 'number' && data.revision > Number.MAX_SAFE_INTEGER)
                ? data.revision.toString()
                : Number(data.revision ?? 0).toString(),
            publicKeys: data.publicKeys ?? data.public_keys ?? null,
            public_keys: data.publicKeys ?? data.public_keys ?? null,
            createdAt: new Date().toISOString(),
            isAuthenticated: true,
            active_identity_id: targetId
        }
        debugLogger.log(`[Storage] saveIdentityDataToStore invoked for ${targetId}`, 'info')
        try {
            await invoke('save_identity_unified', {
                network: network,
                payload: fullIdentityObject
            })
            debugLogger.log(`[Storage] ✅ Identity persisted via 'save_identity_unified'`, 'info')
        } catch (err: any) {
            debugLogger.log(`[Storage] ❌ Failed to persist identity: ${err?.message || err}`, 'error')
            throw err
        }
    },
    async saveKeys(
        this: IIdentityState,
        network: 'mainnet' | 'testnet',
        targetId: string,
        keys: any[]
    ): Promise<void> {
        try {
            if (!keys || keys.length === 0) return
            await invoke('save_private_keys', {
                network,
                identityId: targetId,
                keys
            })
            debugLogger.log(`[Storage] Keys saved to safu store for ${targetId}`, 'info')
        } catch (err: any) {
            debugLogger.log(`[Storage] Failed to save keys: ${err}`, 'error')
            throw new Error('Failed to save keys')
        }
    },
    async saveToStorage(this: IIdentityState, networkOverride?: 'mainnet' | 'testnet') {
        const network = networkOverride || await this.getCurrentNetwork()
        // Standardize identifier check
        const id = this.identityId || this.identity?.identityId
        if (!id) {
            debugLogger.log(`[Storage] saveToStorage skipped: No active identity.`, 'warn')
            return
        }
        const identityForSave = {
            identityId: id,
            identityIdx: this.identity?.identityIdx ?? 0,
            username: this.username ?? id,
            balance: this.balance ?? this.identity?.balance ?? '0',
            revision: this.revision ?? this.identity?.revision ?? 0,
            publicKeys: Array.isArray(this.publicKeys) && this.publicKeys.length > 0
                ? this.publicKeys
                : (this.identity?.publicKeys || []),
        }
        await this.saveIdentityDataToStore(network, id, identityForSave)
    },
    /**
     * Loads identity from persistent storage.
     * Modified to prevent accidental wipes during race conditions.
     */
    async loadFromStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            let loadedMap: Record<string, any> | null = null
            try {
                const map = await invoke<Record<string, any>>('load_identities_map', { network })
                loadedMap = map && Object.keys(map).length > 0 ? map : null
            } catch (e) {
                loadedMap = null
            }
            if (loadedMap) {
                const availableIds = Object.keys(loadedMap).filter(k => k !== '__active_identity_id')
                if (availableIds.length === 0) {
                    // SAFETY: Only reset if we aren't currently holding an identity in memory.
                    // This prevents wipes if a network-ensure refresh triggers a load while disk is busy.
                    if (!this.isConnected) {
                        debugLogger.log('[Storage] No identities on disk and none in RAM. Resetting.', 'info')
                        this.resetStoreState()
                    }
                    return
                }
                const persistedActiveId = loadedMap['__active_identity_id'] as string | undefined
                let targetId: string = ''
                let needsPersistenceUpdate = false
                if (persistedActiveId && availableIds.includes(persistedActiveId)) {
                    targetId = persistedActiveId
                } else {
                    targetId = availableIds[0] || ''
                    needsPersistenceUpdate = true
                }
                const data = loadedMap[targetId]
                if (data) {
                    const publicKeys = data.publicKeys ?? data.public_keys ?? []
                    this.username = data.username ?? data.dpnsUsername ?? data.identity_id ?? null
                    this.identityId = data.identity_id || targetId || null
                    this.identity = {
                        identityId: data.identity_id || targetId,
                        identityIdx: data.identityIdx ?? data.identity_idx ?? 0,
                        balance: data.balance || '0',
                        revision: typeof data.revision === 'number'
                            ? data.revision
                            : Number(data.revision || 0),
                        publicKeys,
                        username: data.username ?? undefined
                    }
                    this.balance = data.balance || null
                    this.revision = typeof data.revision === 'number'
                        ? data.revision
                        : Number(data.revision || 0),
                    this.isAuthenticated = data.isAuthenticated ?? true
                    this.publicKeys = publicKeys
                    this.isConnected = this.isAuthenticated && !!this.identityId
                    if (needsPersistenceUpdate) {
                        invoke('update_active_identity_marker', {
                            network: network,
                            activeId: targetId
                        }).catch(e => console.error(e))
                    }
                    return
                }
            }
            // If no map found, only update isConnected but don't force a full wipe of current RAM
            if (!this.isConnected) {
                this.isConnected = false
            }
        } catch (err: any) {
            debugLogger.log(`[Storage] Exception in loadFromStorage: ${err}`, 'error')
            throw err
        }
    },
    resetStoreState(this: IIdentityState) {
        this.username = null
        this.identityId = null
        this.identity = null
        this.balance = null
        this.revision = null
        this.isAuthenticated = false
        this.publicKeys = []
        this.isConnected = false
    },
    async clearStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            const id = this.identityId || ''
            await invoke('delete_private_keys', { network, identityId: id })
            await invoke('delete_identity_data', { network, identityId: id })
            await invoke('delete_mnemonic', { network })
            await invoke('clear_discovered_identities', { network })
            this.resetStoreState()
        } catch (err: any) {
            throw err
        }
    },
    async saveMnemonicToStore(this: IIdentityState, network: 'mainnet' | 'testnet', seedPhrase: string): Promise<void> {
        await invoke('save_mnemonic', { network, payload: { seedPhrase } })
    },
    async loadMnemonic(this: IIdentityState, network: 'mainnet' | 'testnet'): Promise<{ seedPhrase: string } | null> {
        try {
            return await invoke<{ seedPhrase: string } | null>('load_mnemonic', { network })
        } catch {
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
    async saveDiscoveredIdentities(this: IIdentityState, identities: DiscoveredIdentity[], network: 'mainnet' | 'testnet', keyType: 'seed' | 'private'): Promise<{ success: boolean; savedCount: number; error?: string }> {
        try {
            const valid = identities.filter(id => id.identityId && id.identityId.trim().length > 0)
            if (valid.length === 0) return { success: false, savedCount: 0, error: 'No valid identities' }
            const rustIdentities = valid.map(identity => ({
                identity_id: identity.identityId,
                identity_idx: identity.identityIdx || 0,
                dpns_username: identity.dpnsUsername || null,
                balance: identity.balance ? String(identity.balance) : null,
                key_type: keyType,
                discovered_key: null,
                discovered_at: new Date().toISOString()
            }))
            const result = await invoke<number>('save_discovered_identities', { network, discoveredIdentities: rustIdentities })
            return { success: true, savedCount: result }
        } catch (err: any) {
            return { success: false, savedCount: 0, error: err.message }
        }
    },
    async loadDiscoveredIdentities(this: IIdentityState, network: 'mainnet' | 'testnet'): Promise<RustDiscoveredIdentitiesStore | null> {
        try {
            return await invoke<RustDiscoveredIdentitiesStore | null>('load_discovered_identities', { network })
        } catch {
            return null
        }
    },
    async clearDiscoveredIdentities(this: IIdentityState, network: 'mainnet' | 'testnet'): Promise<{ success: boolean; error?: string }> {
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
            } catch {
                return {}
            }
        }
    }
}
