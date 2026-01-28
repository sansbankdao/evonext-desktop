// src/stores/storage.ts

import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type {
    IIdentityStateProps, // Updated to use the props-only interface
    RustDiscoveredIdentitiesStore,
    DiscoveredIdentity,
    IIdentity
} from '@/types'
import { debugLogger } from '@/utils/debugLogger'
export const useStorageStore = defineStore('storage', () => {
    const state = reactive<IIdentityStateProps>({
        username: null,
        identityId: null,
        identityIdx: undefined,
        displayName: null,
        identity: null,
        balance: null,
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
    const loadSettings = async (): Promise<any> => {
        try {
            return await invoke('load_settings')
        } catch {
            return null
        }
    }
    const getCurrentNetwork = async (): Promise<'mainnet' | 'testnet'> => {
        try {
            const settings = await loadSettings()
            return settings?.network === 'testnet' ? 'testnet' : 'mainnet'
        } catch {
            return 'mainnet'
        }
    }
    const saveIdentityDataToStore = async (
        network: 'mainnet' | 'testnet',
        targetId: string,
        data: any
    ): Promise<void> => {
        if (!targetId || targetId === 'undefined') return
        const payload = {
            identity_id: targetId,
            identity_idx: Number(data.identityIdx ?? data.identity_idx ?? 0),
            username: data.username ?? targetId,
            dpns_username: data.dpnsUsername ?? data.username ?? null,
            balance: String(data.balance ?? '0'),
            revision: String(data.revision ?? '0'),
            public_keys: data.publicKeys ?? data.public_keys ?? [],
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
    }
    const saveKeys = async (
        network: 'mainnet' | 'testnet',
        targetId: string,
        keys: any[]
    ): Promise<void> => {
        try {
            if (!keys || !keys.length) return
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
    }
    const loadFromStorage = async (): Promise<void> => {
        try {
            const network = await getCurrentNetwork()
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
                state.identityId = data.identity_id || targetId
                state.username = data.username || data.identity_id
                state.balance = data.balance || '0'
                state.revision = Number(data.revision || 0)
                state.publicKeys = data.public_keys || []
                state.isAuthenticated = true
                state.isConnected = true
                state.identity = {
                    identityId: state.identityId || '',
                    identityIdx: data.identity_idx ?? 0,
                    balance: state.balance || '0',
                    revision: state.revision || 0,
                    publicKeys: state.publicKeys || []
                } as IIdentity
            }
        } catch (err) {
            debugLogger.log(`[Storage] loadFromStorage Error: ${err}`, 'error')
        }
    }
    const initFromStorage = async (): Promise<void> => {
        await loadFromStorage()
    }
    const fetchBalance = async (): Promise<void> => {
        try {
            const network = await getCurrentNetwork()
            if (!state.identityId) return
            const identity = await invoke<any>('get_identity_info', {
                identityId: state.identityId,
                network
            })
            if (identity && identity.balance) {
                state.balance = String(identity.balance)
                if (state.identity) state.identity.balance = state.balance
            }
        } catch (err) {
            console.error('Failed to fetch balance:', err)
        }
    }
    const syncIdentityToBackend = async (network: string): Promise<void> => {
        if (!state.identityId) return
        await saveIdentityDataToStore((network as 'mainnet' | 'testnet'), state.identityId, {
            identityId: state.identityId,
            identityIdx: state.identity?.identityIdx ?? 0,
            username: state.username || state.identityId,
            balance: state.balance || '0',
            revision: state.revision || 0,
            publicKeys: state.publicKeys || [],
            active_identity_id: state.identityId
        })
    }
    const resetStoreState = (): void => {
        state.username = null
        state.identityId = null
        state.identity = null
        state.balance = null
        state.revision = null
        state.isAuthenticated = false
        state.publicKeys = []
        state.isConnected = false
    }
    const clearStorage = async (): Promise<void> => {
        try {
            const network = await getCurrentNetwork()
            const id = state.identityId || ''
            await invoke('delete_private_keys', { network, identityId: id })
            await invoke('delete_identity_data', { network, identityId: id })
            await invoke('delete_mnemonic', { network })
            await invoke('clear_discovered_identities', { network })
            resetStoreState()
        } catch (err: any) {
            throw err
        }
    }
    const saveMnemonicToStore = async (
        network: 'mainnet' | 'testnet',
        seedPhrase: string
    ): Promise<void> => {
        await invoke('save_mnemonic', { network, payload: { seedPhrase } })
    }
    const loadMnemonic = async (
        network: 'mainnet' | 'testnet'
    ): Promise<{ seedPhrase: string } | null> => {
        try {
            return await invoke<{ seedPhrase: string } | null>('load_mnemonic', { network })
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
            const result = await invoke<number>('save_discovered_identities', {
                network,
                discoveredIdentities: rustIdentities
            })
            return { success: true, savedCount: result }
        } catch (err: any) {
            return { success: false, savedCount: 0, error: err.message }
        }
    }
    const loadDiscoveredIdentities = async (
        network: 'mainnet' | 'testnet'
    ): Promise<RustDiscoveredIdentitiesStore | null> => {
        try {
            return await invoke<RustDiscoveredIdentitiesStore | null>(
                'load_discovered_identities',
                { network }
            )
        } catch {
            return null
        }
    }
    const clearDiscoveredIdentities = async (
        network: 'mainnet' | 'testnet'
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            await invoke('clear_discovered_identities', { network })
            return { success: true }
        } catch (err: any) {
            return { success: false, error: err.message }
        }
    }
    const saveToStorage = async (networkOverride?: 'mainnet' | 'testnet'): Promise<void> => {
        const network = networkOverride || await getCurrentNetwork()
        const id = state.identityId || state.identity?.identityId
        if (!id) {
            debugLogger.log(`[Storage] saveToStorage skipped: No active identity.`, 'warn')
            return
        }
        const identityForSave = {
            identityId: id,
            identityIdx: state.identity?.identityIdx ?? 0,
            username: state.username ?? id,
            balance: state.balance ?? state.identity?.balance ?? '0',
            revision: state.revision ?? state.identity?.revision ?? 0,
            publicKeys: (Array.isArray(state.publicKeys) && state.publicKeys.length > 0)
                ? state.publicKeys
                : []
        }
        await saveIdentityDataToStore(network, id, identityForSave)
    }
    return {
        state,
        saveIdentityDataToStore,
        saveKeys,
        loadFromStorage,
        initFromStorage,
        fetchBalance,
        syncIdentityToBackend,
        resetStoreState,
        clearStorage,
        saveMnemonicToStore,
        loadMnemonic,
        loadSettings,
        getCurrentNetwork,
        saveDiscoveredIdentities,
        loadDiscoveredIdentities,
        clearDiscoveredIdentities,
        saveToStorage
    }
})
