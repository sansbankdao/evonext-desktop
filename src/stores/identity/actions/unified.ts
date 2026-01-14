// src/stores/identity/actions/unified.ts

import { invoke } from '@tauri-apps/api/core'

type Network = 'mainnet' | 'testnet'

export function unifiedActions() {
    return {
        async connectFromDiscoveryUnified(
            this: any,
            discovered: {
                identityId: string
                identityIdx?: number
                balance?: string | number | null
                revision?: number | string | null
                dpnsUsername?: string | null
                publicKeys?: any[] | null
            },
            network: Network
        ): Promise<void> {

            if (this.connecting === true) return
            if (!discovered || !discovered.identityId) {
                this.error = 'No discovered identity to connect'
                return
            }
            this.error = null
            if (typeof this.connecting === 'boolean') this.connecting = true
            try {
                const balanceStr =
                    discovered.balance == null ? null : String(discovered.balance)
                const res = (await invoke('save_identity_unified', {
                    network,
                    payload: {
                        identityId: discovered.identityId,
                        identityIdx: discovered.identityIdx ?? 0,
                        username: discovered.identityId,
                        dpnsUsername: discovered.dpnsUsername ?? null,
                        balance: balanceStr,
                        revision: discovered.revision ?? null,
                        publicKeys: discovered.publicKeys ?? null,
                        createdAt: new Date().toISOString()
                    }
                })) as { success: boolean; error?: string }

                if (!res || !res.success) {
                    throw new Error(res?.error || 'Failed to save identity')
                }

                this.activeIdentity = {
                    identityId: discovered.identityId,
                    identityIdx: discovered.identityIdx ?? 0,
                    username: discovered.identityId,
                    displayName: discovered.identityId,
                    dpnsUsername: discovered.dpnsUsername ?? null,
                    balance: balanceStr ?? '0',
                    revision:
                        typeof discovered.revision === 'number'
                            ? discovered.revision
                            : Number(discovered.revision || 0),
                    publicKeys: discovered.publicKeys ?? [],
                    isAuthenticated: true,
                    createdAt: new Date().toISOString()
                }
                this.isConnected = true
            } catch (e: any) {
                this.error = e?.message || 'Unknown error during connect'
                this.isConnected = false
                this.activeIdentity = null
                throw e
            } finally {
                if (typeof this.connecting === 'boolean') this.connecting = false
            }
        },
        async loadActiveIdentityUnified(this: any, network: Network): Promise<void> {
            try {
                const res = (await invoke('query_and_update_identity', {
                    network,
                    identityId: this.activeIdentity?.identityId || ''
                })) as { success: boolean; error?: string; payload?: any }
                if (res.success && res.payload) {
                    const data = res.payload
                    this.activeIdentity = {
                        identityId: data.identity_id,
                        identityIdx: data.identity_idx || 0,
                        balance: String(data.balance || '0'),
                        revision: Number(data.revision || 0),
                        publicKeys: data.public_keys || [],
                        isAuthenticated: true,
                        username: data.username || data.identity_id,
                        displayName: data.username || data.identity_id,
                        dpnsUsername: data.dpns_username || null,
                        createdAt: data.created_at
                    }
                    this.isConnected = true
                    this.error = null
                } else {
                    this.isConnected = false
                    this.error = res.error || 'Failed to load identity'
                }
            } catch (e: any) {
                this.isConnected = false
                this.error = e?.message || 'Failed to load identity'
            }
        },
        /**
         * NEW: Syncs the current Pinia store state to the Rust backend.
         * This is called by the polling mechanism to update .identity-testnet.json
         */
        async syncIdentityToBackend(this: any, network: Network): Promise<void> {
            // Determine source of truth for the data.
            // If activeIdentity exists (Unified flow), use it.
            // Otherwise fallback to flat state properties (Legacy flow).
            const id = this.activeIdentity?.identityId || this.identityId

            if (!id) {
                console.warn('[syncIdentityToBackend] No identity ID found to sync.')
                return
            }

            try {
                // Construct payload matching the structure expected by Rust
                const payload = {
                    identityId: id,
                    identityIdx: this.activeIdentity?.identityIdx ?? this.identityIdx ?? 0,
                    username: this.activeIdentity?.username ?? this.username ?? id,
                    dpnsUsername: this.activeIdentity?.dpnsUsername ?? this.dpnsUsername ?? null,
                    balance: this.activeIdentity?.balance ?? this.balance ?? '0',
                    revision: this.activeIdentity?.revision ?? this.revision ?? null,
                    publicKeys: this.activeIdentity?.publicKeys ?? this.publicKeys ?? null,
                    activeIdentityId: id // Ensure we mark this as the active one
                }

                const res = (await invoke('save_identity_unified', {
                    network,
                    payload
                })) as { success: boolean; error?: string }

                if (!res || !res.success) {
                    console.error('[syncIdentityToBackend] Failed to save:', res?.error)
                } else {
                    console.log('[syncIdentityToBackend] Identity synced to Rust backend successfully.')
                }
            } catch (e: any) {
                console.error('[syncIdentityToBackend] Error syncing identity:', e)
            }
        }
    }
}
