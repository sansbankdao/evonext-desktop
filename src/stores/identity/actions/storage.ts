// src/stores/identity/actions/storage.ts
import { invoke } from '@tauri-apps/api/core'
import { type IIdentityState, type RustDiscoveredIdentitiesStore, type DiscoveredIdentity } from '@/types'
import { log } from '@/utils/env'
export const storageActions = () => ({
    // --- Main Persistence Methods ---
    /**
     * Helper to save identity object (non-keys) to Rust storage
     * Uses unified command to normalize fields and write .identity-[network].json
     */
    async saveIdentityDataToStore(
        this: IIdentityState,
        network: 'mainnet' | 'testnet',
        targetId: string,
        data: any
    ): Promise<void> {
        try {
            const payload = {
                identityId: targetId,
                identityIdx: data.identityIdx ?? data.identity_idx ?? 0,
                username: data.username ?? this.username ?? targetId,
                dpnsUsername: data.dpnsUsername ?? null,
                balance: data.balance != null ? String(data.balance) : null,
                revision: typeof data.revision === 'string'
                    ? Number(data.revision) || 0
                    : (data.revision ?? null),
                // Prefer publicKeys from TS store, fallback to legacy public_keys if present
                publicKeys: data.publicKeys ?? data.public_keys ?? null,
                createdAt: new Date().toISOString()
            }
            const res = await invoke<{
                success: boolean
                error?: string
                payload?: unknown
            }>('save_identity_unified', { network, payload })
            if (!res || !res.success) {
                throw new Error(res?.error || 'save_identity_unified failed')
            }
            log('info', `[Storage] Identity data saved for ${targetId} on ${network}`)
        } catch (err: any) {
            log('error', '[Storage] Failed to save identity data:', err)
            throw new Error('Failed to save identity data')
        }
    },
    /**
     * Save private keys to Rust storage (.safu-[network].json)
     */
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
                // Ensure publicKeys on the identity we pass
                const identityForSave = {
                    identityId: this.identity.identityId || this.identityId,
                    identityIdx: this.identity.identityIdx ?? 0,
                    username: this.username ?? this.identityId,
                    balance: this.balance ?? this.identity.balance,
                    revision: this.revision ?? this.identity.revision ?? 0,
                    publicKeys: Array.isArray(this.publicKeys) && this.publicKeys.length > 0
                        ? this.publicKeys
                        : (this.identity.publicKeys || [])
                }
                await this.saveIdentityDataToStore(
                    network,
                    this.identityId,
                    identityForSave
                )
            }
        } catch (err) {
            console.error('[Storage] saveToStorage failed', err)
        }
    },
    /**
     * Loads identity state from persistent storage
     * Supports both map format and legacy single entry format
     */
    async loadFromStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            // Preferred: load identity map and select current identityId or first
            let loadedMap: Record<string, any> | null = null
            try {
                loadedMap = await invoke<Record<string, any>>(
                    'load_identities_map',
                    { network }
                )
            } catch {
                loadedMap = null
            }
            if (loadedMap && Object.keys(loadedMap).length > 0) {
                const keys = Object.keys(loadedMap)
                const targetId = (this.identityId ?? keys[0]) as string
                const data = loadedMap[targetId]
                if (data) {
                    this.username = data.username || data.identity_id || null
                    this.identityId = data.identity_id || targetId || null
                    const publicKeys = data.public_keys || []
                    this.identity = {
                        identityId: data.identity_id || targetId,
                        identityIdx: data.identity_idx || 0,
                        balance: data.balance || '0',
                        revision: typeof data.revision === 'number'
                            ? data.revision
                            : Number(data.revision || 0),
                        publicKeys,
                        username: data.username || undefined
                    }
                    this.balance = data.balance || null
                    this.revision = typeof data.revision === 'number'
                        ? data.revision
                        : Number(data.revision || 0)
                    this.isAuthenticated = data.is_authenticated ?? true
                    this.publicKeys = publicKeys
                    log('info', `[Storage] Identity map loaded for ${network}`)
                    return
                }
            }
            // Fallback: legacy single IdentityData
            const data = await invoke<any>('load_identity_data', { network })
            if (data) {
                this.username = data.username || null
                this.identityId = data.identity_id || null
                const publicKeys = data.public_keys || []
                this.identity = {
                    identityId: data.identity_id || '',
                    identityIdx: data.identity_idx || 0,
                    balance: data.balance || '0',
                    revision: typeof data.revision === 'number'
                        ? data.revision
                        : Number(data.revision || 0),
                    publicKeys,
                    username: data.username || undefined
                }
                this.balance = data.balance || null
                this.revision = typeof data.revision === 'number'
                    ? data.revision
                    : Number(data.revision || 0)
                this.isAuthenticated = data.is_authenticated ?? true
                this.publicKeys = publicKeys
                log('info', `[Storage] Legacy identity data loaded for ${network}`)
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
            await invoke('delete_private_keys', {
                network,
                identityId: this.identityId || ''
            })
            await invoke('delete_identity_data', {
                network,
                identityId: this.identityId || ''
            })
            await invoke('delete_mnemonic', { network })
            await invoke('clear_discovered_identities', { network })
            this.username = null
            this.identityId = null
            this.identity = null
            this.balance = null
            this.revision = null
            this.isAuthenticated = false
            this.publicKeys = []
            this.isConnected = false
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
            return await invoke<{ seedPhrase: string } | null>(
                'load_mnemonic',
                { network }
            )
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
            return await invoke<RustDiscoveredIdentitiesStore | null>(
                'load_discovered_identities',
                { network }
            )
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
                const map = await invoke<Record<string, any>>(
                    'load_identities_map',
                    { network }
                )
                this.identitiesMap = map
                return map
            } catch (e) {
                return {}
            }
        }
    }
}
