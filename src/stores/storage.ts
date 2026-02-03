// src/stores/storage.ts

import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { invoke } from '@/utils/tauri'
import type {
    RustDiscoveredIdentitiesStore,
    DiscoveredIdentity,
    IIdentity,
    IPublicKey
} from '@/types'
import { debugLogger } from '@/utils/debugLogger'

interface IStorageState {
    username: string | null
    identityId: string | null
    identityIdx: number | undefined
    displayName: string | null
    identity: IIdentity | null
    balance: string | null
    balanceBigInt: bigint | undefined
    dashBigInt: bigint | undefined
    publicKeys: IPublicKey[]
    revision: number | null
    isAuthenticated: boolean
    premiumAccess: boolean
    connectionError: string | null
    isConnected: boolean
    isConnecting: boolean
    lastConnected: string | null
    discoveryProgress: number | null
    identitiesMap: Record<string, any>
}

export const useStorageStore = defineStore('storage', () => {
    const state = reactive<IStorageState>({
        username: null,
        identityId: null,
        identityIdx: undefined,
        displayName: null,
        identity: null,
        balance: '0',
        balanceBigInt: undefined,
        dashBigInt: undefined,
        publicKeys: [],
        revision: null,
        isAuthenticated: false,
        premiumAccess: false,
        connectionError: null,
        isConnected: false,
        isConnecting: false,
        lastConnected: null,
        discoveryProgress: null,
        identitiesMap: {}
    })
    const initFromStorage = async (): Promise<void> => {
        try {
            debugLogger.log('[Storage] Initializing from storage...', 'info')
            const network = await getCurrentNetwork()
            const identitiesStore = await loadDiscoveredIdentities(network)
            // Robust check for the identities store and array
            if (identitiesStore?.identities && Array.isArray(identitiesStore.identities)) {
                if (identitiesStore.identities.length > 0) {
                    const active = identitiesStore.identities[0]
                    // active is narrowed here
                    if (active) {
                        state.identityId = active.identity_id ?? null
                        state.username = (active.dpns_username ?? active.identity_id) ?? null
                        state.balance = active.balance ?? '0'
                        state.isAuthenticated = true
                        debugLogger.log(`[Storage] Loaded identity: ${state.identityId}`, 'info')
                    }
                }
            }
        } catch (err: any) {
            debugLogger.log(`[Storage] Init Error: ${err.message}`, 'error')
        }
    }
    const loadSettings = async (): Promise<any> => {
        try {
            return await invoke<any>('load_settings')
        } catch {
            return null
        }
    }
    const getCurrentNetwork = async (): Promise<'mainnet' | 'testnet'> => {
        const settings = await loadSettings()
        return settings?.network === 'testnet' ? 'testnet' : 'mainnet'
    }
    const saveIdentityDataToStore = async (
        network: 'mainnet' | 'testnet',
        targetId: string,
        data: any
    ): Promise<void> => {
        if (!targetId || targetId === 'undefined') return
        const payload = {
            identityId: targetId,
            identityIdx: Number(data.identityIdx ?? 0),
            username: data.username ?? targetId,
            balance: String(data.balance ?? '0'),
            revision: Number(data.revision ?? 0),
            publicKeys: data.publicKeys ?? [],
            dpnsUsername: data.dpnsUsername ?? data.username ?? null,
            createdAt: new Date().toISOString()
        }
        try {
            await invoke<void>('save_identity', { network, payload })
            debugLogger.log(`[Storage] Identity ${targetId} synced`, 'info')
        } catch (err: any) {
            debugLogger.log(`[Storage] Rust Sync Error: ${err}`, 'error')
            throw err
        }
    }
    const saveKeys = async (
        network: 'mainnet' | 'testnet',
        targetId: string,
        keys: any[]
    ): Promise<void> => {
        try {
            if (!keys || !keys.length) return
            await invoke<void>('save_keys', { network, identityId: targetId, keys })
        } catch (err: any) {
            debugLogger.log(`[Storage] Keystore Sync Error: ${err}`, 'error')
            throw err
        }
    }
    const saveToStorage = async (networkOverride?: 'mainnet' | 'testnet'): Promise<void> => {
        const network = networkOverride || await getCurrentNetwork()
        const id = state.identityId || state.identity?.identityId
        if (!id) return
        const identityForSave = {
            identityIdx: state.identity?.identityIdx ?? 0,
            username: state.username ?? id,
            balance: state.balance ?? '0',
            revision: state.revision ?? 0,
            publicKeys: state.publicKeys
        }
        await saveIdentityDataToStore(network, id, identityForSave)
    }
    const loadMnemonic = async (network: 'mainnet' | 'testnet'): Promise<{ seedPhrase: string } | null> => {
        try {
            return await invoke<{ seedPhrase: string }>('load_mnemonic', { network })
        } catch {
            return null
        }
    }
    const saveDiscoveredIdentities = async (
        identities: DiscoveredIdentity[],
        network: 'mainnet' | 'testnet',
        keyType: 'seed' | 'private'
    ): Promise<{ success: boolean; savedCount: number; error?: string }> => {
        try {
            const valid = identities.filter(id => id.identityId && id.identityId.trim().length > 0)
            const rustIdentities = valid.map(identity => ({
                identity_id: identity.identityId,
                identity_idx: identity.identityIdx || 0,
                dpns_username: identity.dpnsUsername || null,
                balance: identity.balance ? String(identity.balance) : '0',
                key_type: keyType,
                discovered_key: null,
                discovered_at: new Date().toISOString()
            }))
            const savedCount = await invoke<number>('save_discovered_identities', {
                network,
                discoveredIdentities: rustIdentities
            })
            return { success: true, savedCount }
        } catch (err: any) {
            return { success: false, savedCount: 0, error: err.message }
        }
    }
    const loadDiscoveredIdentities = async (
        network: 'mainnet' | 'testnet'
    ): Promise<RustDiscoveredIdentitiesStore | null> => {
        try {
            return await invoke<RustDiscoveredIdentitiesStore>('load_discovered_identities', { network })
        } catch {
            return null
        }
    }
    const clearDiscoveredIdentities = async (
        network: 'mainnet' | 'testnet'
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            await invoke<void>('clear_discovered_identities', { network })
            return { success: true }
        } catch (err: any) {
            return { success: false, error: err.message }
        }
    }
    const clearStorage = async (): Promise<void> => {
        try {
            const network = await getCurrentNetwork()
            const id = state.identityId || ''
            await invoke('delete_identity', { network, identityId: id })
            await invoke('delete_mnemonic', { network })
            state.isAuthenticated = false
            state.identityId = null
        } catch (err: any) {
            throw err
        }
    }
    return {
        state,
        initFromStorage,
        saveIdentityDataToStore,
        saveKeys,
        clearStorage,
        loadMnemonic,
        loadSettings,
        getCurrentNetwork,
        saveDiscoveredIdentities,
        loadDiscoveredIdentities,
        clearDiscoveredIdentities,
        saveToStorage
    }
})
