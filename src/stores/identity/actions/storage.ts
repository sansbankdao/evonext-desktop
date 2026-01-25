// src/stores/identity/action/storage.ts

import { invoke } from '@tauri-apps/api/core'
import {
    type IIdentityState,
    // type RustDiscoveredIdentitiesStore,
    // type DiscoveredIdentity
} from '@/types'
import { debugLogger } from '@/utils/debugLogger'
export const storageActions = () => ({
    /**
     * Standardized persistence gate to Rust IDENTITY file.
     */
    async saveIdentityDataToStore(
        this: IIdentityState,
        network: 'mainnet' | 'testnet',
        targetId: string,
        data: any
    ): Promise<void> {
        if (!targetId || targetId === 'undefined') return
        const payload = {
            identity_id: targetId,
            identity_idx: Number(data.identityIdx ?? 0),
            username: data.username ?? targetId,
            dpns_username: data.dpnsUsername ?? data.username ?? null,
            balance: String(data.balance ?? '0'),
            revision: String(data.revision ?? '0'),
            public_keys: data.publicKeys ?? [],
            created_at: new Date().toISOString(),
            active_identity_id: data.active_identity_id || targetId
        }
        try {
            await invoke('save_identity_unified', { network, payload })
            debugLogger.log(`[Storage] Identity ${targetId} synced to Rust`, 'info')
        } catch (err: any) {
            debugLogger.log(`[Storage] Rust Sync Error: ${err}`, 'error')
            throw err
        }
    },
    /**
     * Synchronizes local private keys to the Rust SAFE (Keystore) file.
     */
    async saveKeys(
        this: IIdentityState,
        network: 'mainnet' | 'testnet',
        targetId: string,
        keys: any[]
    ): Promise<void> {
        try {
            if (!keys.length) return
            await invoke('save_private_keys', {
                network,
                identityId: targetId,
                keys
            })
            debugLogger.log(`[Storage] Keystore updated for ${targetId}`, 'info')
        } catch (err: any) {
            debugLogger.log(`[Storage] Keystore Sync Error: ${err}`, 'error')
            throw err
        }
    },
    /**
     * Root-level load that restores memory state from the Rust identity map.
     */
    async loadFromStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            const loadedMap = await invoke<Record<string, any>>(
                'load_identities_map',
                { network }
            )
            if (!loadedMap || Object.keys(loadedMap).length === 0) return
            // Extract the active marker injected by Rust's save_identity_map_internal
            const availableIds = Object.keys(loadedMap).filter(k => !k.startsWith('__'))
            const persistedActiveId = loadedMap['__active_identity_id']
            const targetId = (persistedActiveId && availableIds.includes(persistedActiveId))
                ? persistedActiveId
                : availableIds[0]
            const data = loadedMap[targetId]
            if (data) {
                this.identityId = data.identity_id || targetId
                this.username = data.username || data.identity_id
                this.balance = data.balance || '0'
                this.revision = Number(data.revision || 0)
                this.publicKeys = data.public_keys || []
                this.isAuthenticated = true
                this.isConnected = true
                this.identity = {
                    identityId: this.identityId as string,
                    identityIdx: data.identity_idx ?? 0,
                    balance: this.balance,
                    revision: this.revision,
                    publicKeys: this.publicKeys
                }
            }
        } catch (err) {
            debugLogger.log(`[Storage] loadFromStorage Error: ${err}`, 'error')
        }
    }
})
