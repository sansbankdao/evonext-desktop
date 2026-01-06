// src/stores/identity/actions/connectWriteOnly.ts

import { invoke } from '@tauri-apps/api/core'

type Network = 'mainnet' | 'testnet'

export function connectWriteOnlyActions() {
    return {
        async connectWriteOnlyFromDiscovered(
            this: any,
            discovered: {
                identityId: string
                identityIdx?: number
                balance?: string | number | null
                revision?: number | string | null
                username?: string | null
                dpnsUsername?: string | null
                publicKeys?: any[] | null
                publicKeyIds?: number[] | null
            },
            network: Network
        ): Promise<void> {
            if (!discovered || !discovered.identityId) {
                this.error = 'No discovered identity to connect'
                throw new Error(this.error)
            }

            const payload: any = {
                identity_id: discovered.identityId,
                identity_idx: discovered.identityIdx ?? 0,
                username: discovered.username ?? discovered.identityId,
                balance: discovered.balance == null ? null : String(discovered.balance),
                revision: discovered.revision ?? null,
                created_at: new Date().toISOString(),
                is_authenticated: true
            }

            if (Array.isArray(discovered.publicKeys)) {
                payload.public_keys = discovered.publicKeys
            }
            if (Array.isArray(discovered.publicKeyIds) && discovered.publicKeyIds.length > 0) {
                payload.public_key_ids = discovered.publicKeyIds
            }

            const ok = await invoke<boolean>('save_identity_data_untyped', {
                network,
                payload
            }).catch((e: any) => {
                const msg = e?.message || String(e)
                console.error('[connectWriteOnly] invoke failed:', msg)
                return false
            })

            if (!ok) {
                this.error = 'Failed to connect (write identity)'
                this.isConnected = false
                throw new Error(this.error)
            }

            this.activeIdentity = {
                identityId: payload.identity_id,
                identityIdx: payload.identity_idx,
                username: payload.username,
                displayName: payload.username,
                dpnsUsername: discovered.dpnsUsername ?? null,
                balance: payload.balance ?? '0',
                revision:
                    typeof payload.revision === 'number'
                        ? payload.revision
                        : Number(payload.revision || 0),
                publicKeys: discovered.publicKeys ?? [],
                isAuthenticated: true,
                createdAt: payload.created_at
            }
            this.isConnected = true
            this.error = null
        }
    }
}
