// src/stores/identity/action/storage.ts

import { invoke } from '@tauri-apps/api/core'
import {
    type IIdentityState,
    type RustDiscoveredIdentitiesStore,
    type DiscoveredIdentity
} from '@/types'
import { debugLogger } from '@/utils/debugLogger'
export const storageActions = () => ({
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
    async loadFromStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            const loadedMap = await invoke<Record<string, any>>(
                'load_identities_map',
                { network }
            )
            if (!loadedMap || Object.keys(loadedMap).length === 0) return
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
    },
    async initFromStorage(this: IIdentityState) {
        await this.loadFromStorage()
    },
    async fetchBalance(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            if (!this.identityId) return
            const identity = await invoke<any>('get_identity_info', {
                identityId: this.identityId,
                network
            })
            if (identity && identity.balance) {
                this.balance = String(identity.balance)
            }
        } catch (err) {
            console.error('Failed to fetch balance:', err)
        }
    },
    async syncIdentityToBackend(this: IIdentityState, network: string) {
        if (!this.identityId) return
        await this.saveIdentityDataToStore((network as 'mainnet' | 'testnet'), this.identityId, {
            identityId: this.identityId,
            identityIdx: this.identity?.identityIdx ?? 0,
            username: this.username || this.identityId,
            balance: this.balance || '0',
            revision: this.revision || 0,
            publicKeys: this.publicKeys || [],
            active_identity_id: this.identityId
        })
    },
    async resetStoreState(this: IIdentityState) {
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
    },
    async saveToStorage(this: IIdentityState, networkOverride?: 'mainnet' | 'testnet') {
        const network = networkOverride || await this.getCurrentNetwork()
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
                : []
        }
        await this.saveIdentityDataToStore(network, id, identityForSave)
    }
})
