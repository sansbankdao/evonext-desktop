// src/stores/identity/actions/storage.ts
import { invoke } from '@tauri-apps/api/core'
import { type IIdentityState, type RustDiscoveredIdentitiesStore, type DiscoveredIdentity } from '@/types'
import { log } from '@/utils/env'
export const storageActions = () => ({
    // --- Main Persistence Methods ---
    /**
     * Save identity (non-private-keys) to Rust storage.
     * Invokes unified command to write to .identity-[network].json.
     * Structure: { "identities": { "identityId": { ... } } }
     */
    // REPLACE THE EXISTING FUNCTION
    async saveIdentityDataToStore(
        this: IIdentityState,
        network: 'mainnet' | 'testnet',
        targetId: string,
        data: any
    ): Promise<void> {
        // Construct full object matching Rust IdentityData shape
        const fullIdentityObject = {
            identityId: targetId,
            identityIdx: data.identityIdx ?? data.identity_idx ?? 0,
            username: data.username ?? this.username ?? targetId,
            dpnsUsername: data.dpnsUsername ?? null,
            // 🔥 FIX: Cast to string properly to prevent overflow issues in JSON/TypeScript
            balance: typeof data.balance === 'bigint' || data.balance > Number.MAX_SAFE_INTEGER
                ? data.balance.toString()
                : String(data.balance ?? '0'),
            revision: typeof data.revision === 'number' && data.revision > Number.MAX_SAFE_INTEGER
                ? data.revision.toString()
                : Number(data.revision ?? 0).toString(),
            publicKeys: data.publicKeys ?? data.public_keys ?? null,
            createdAt: new Date().toISOString(),
            isAuthenticated: true,
            // FIX: Explicitly pass active_identity_id to backend so it can persist it
            // We pass 'targetId' because calling this function usually means we are activating this ID
            // or updating it, so it should be considered the active one.
            active_identity_id: targetId
        }
        log('debug', `[Storage] saveIdentityDataToStore start id=${targetId} net=${network}`)
        log('debug', `[Storage] unified payload: ${JSON.stringify(fullIdentityObject)}`)
        // ... rest of function
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
            log('debug', `[Storage] saveKeys count=${keys.length} id=${targetId} net=${network}`)
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
     * Saves current store state to persistent storage.
     * Safe: logs and returns early if no identity.
     */
    async saveToStorage(this: IIdentityState, networkOverride?: 'mainnet' | 'testnet') {
        const network = networkOverride || await this.getCurrentNetwork()
        if (!this.identity || !this.identityId) {
            log('error', '[Storage] saveToStorage: No active identity in state')
            return
        }
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
        log('debug', `[Storage] saveToStorage payload: ${JSON.stringify(identityForSave)}`)
        await this.saveIdentityDataToStore(network, this.identityId, identityForSave)
    },
    /**
     * Loads identity from persistent storage.
     * Includes "Network Safety Check" and "Persistence Logic".
     */
    async loadFromStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            log('debug', `[Storage] loadFromStorage: net=${network}`)
            // Load identity map
            let loadedMap: Record<string, any> | null = null
            try {
                const map = await invoke<Record<string, any>>('load_identities_map', { network })
                loadedMap = map && Object.keys(map).length > 0 ? map : null
                log('debug', `[Storage] identities_map size=${Object.keys(map || {}).length}`)
            } catch (e) {
                loadedMap = null
                log('debug', `[Storage] load_identities_map failed: ${String(e)}`)
            }
            if (loadedMap) {
                // 1. Extract valid identity keys (exclude metadata keys like __active_identity_id)
                const availableIds = Object.keys(loadedMap).filter(k => k !== '__active_identity_id')
                if (availableIds.length === 0) {
                    this.resetStoreState()
                    return
                }
                // 2. Determine target ID
                // Priority: Persisted Marker -> Current Store State (if valid) -> First Available
                const persistedActiveId = loadedMap['__active_identity_id'] as string | undefined
                // FIX: Initialize targetId definitively to satisfy TS
                let targetId: string = availableIds[0] || ''
                let needsPersistenceUpdate = false
                if (persistedActiveId && availableIds.includes(persistedActiveId)) {
                    // We have a valid persisted marker
                    targetId = persistedActiveId
                    log('info', `[Storage] Loaded persisted active identity: ${targetId}`)
                } else {
                    // No valid marker, or marker points to deleted identity.
                    // We will use the first available, but we MUST update the file now.
                    targetId = availableIds[0] || ''
                    needsPersistenceUpdate = true
                    log('warn', `[Storage] No valid active marker. Defaulting to first available: ${targetId}`)
                }
                // 3. Load Data
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
                        : Number(data.revision || 0)
                    this.isAuthenticated = data.isAuthenticated ?? true
                    this.publicKeys = publicKeys
                    this.isConnected = this.isAuthenticated && !!this.identityId
                    // 4. Persistence Fix: If we defaulted to the first one, update the file immediately
                    // so the next restart remembers this choice.
                    if (needsPersistenceUpdate) {
                        log('info', `[Storage] Updating active identity marker in file to: ${targetId}`)
                        invoke('update_active_identity_marker', {
                            network: network,
                            activeId: targetId
                        }).catch(e => console.error('[Storage] Failed to persist marker:', e))
                    }
                    log('info', `[Storage] Identity map loaded for ${network}`)
                    return
                } else {
                    log('warn', `[Storage] identity ${targetId} not found in map`)
                    this.resetStoreState()
                    return
                }
            }
            // Fallback: legacy single IdentityData (Old Path)
            const data = await invoke<any>('load_identity_data', { network })
            log('debug', `[Storage] load_identity_data: ${data ? 'found' : 'none'}`)
            if (data) {
                const publicKeys = data.publicKeys ?? data.public_keys ?? []
                this.username = data.username || null
                this.identityId = data.identity_id || null
                this.identity = {
                    identityId: data.identity_id || '',
                    identityIdx: data.identityIdx ?? data.identity_idx ?? 0,
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
                this.isAuthenticated = data.isAuthenticated ?? true
                this.publicKeys = publicKeys
                this.isConnected = this.isAuthenticated && !!this.identityId
                log('info', `[Storage] Legacy identity data loaded for ${network}`)
            } else {
                log('info', `[Storage] No identity data found for ${network}`)
                this.isConnected = false
            }
        } catch (err: any) {
            log('error', `[Storage] Failed to load identity data: ${err?.message || err}`)
            this.isConnected = false
            throw err
        }
    },
    /**
     * Resets store state to initial disconnected values.
     */
    resetStoreState(this: IIdentityState) {
        this.username = null
        this.identityId = null
        this.identity = null
        this.balance = null
        this.revision = null
        this.isAuthenticated = false
        this.publicKeys = []
        this.isConnected = false
        log('info', '[Storage] Store state reset')
    },
    /**
     * Clears all storage
     */
    async clearStorage(this: IIdentityState) {
        try {
            const network = await this.getCurrentNetwork()
            log('debug', `[Storage] clearStorage net=${network} id=${this.identityId || 'null'}`)
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
            this.resetStoreState()
            log('info', '[Storage] Storage cleared')
        } catch (err: any) {
            log('error', `[Storage] Failed to clear storage: ${err?.message || err}`)
            throw err
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
            throw err
        }
    },
    async loadMnemonic(
        this: IIdentityState,
        network: 'mainnet' | 'testnet'
    ): Promise<{ seedPhrase: string } | null> {
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
