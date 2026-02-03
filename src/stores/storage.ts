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
// Define a dedicated interface for the state properties only
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
    // Correctly type the reactive state with the property-only interface
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
    const unwrap = <T>(res: any): T => {
        if (res?.status === 'error' || res?.success === false) {
            throw new Error(res.error || 'Command failed')
        }
        return (res?.data ?? res?.payload ?? res) as T
    }
    const loadSettings = async (): Promise<any> => {
        try {
            const res = await invoke('load_settings')
            return unwrap<any>(res)
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
            const res = await invoke('save_identity', { network, payload })
            unwrap<void>(res)
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
            const res = await invoke('save_keys', { network, identityId: targetId, keys })
            unwrap<void>(res)
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
            const res = await invoke('load_mnemonic', { network })
            return unwrap<{ seedPhrase: string }>(res)
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
            const res = await invoke('save_discovered_identities', {
                network,
                discoveredIdentities: rustIdentities
            })
            return { success: true, savedCount: unwrap<number>(res) }
        } catch (err: any) {
            return { success: false, savedCount: 0, error: err.message }
        }
    }
    const loadDiscoveredIdentities = async (
        network: 'mainnet' | 'testnet'
    ): Promise<RustDiscoveredIdentitiesStore | null> => {
        try {
            const res = await invoke('load_discovered_identities', { network })
            return unwrap<RustDiscoveredIdentitiesStore>(res)
        } catch {
            return null
        }
    }
    const clearDiscoveredIdentities = async (
        network: 'mainnet' | 'testnet'
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await invoke('clear_discovered_identities', { network })
            unwrap<void>(res)
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
