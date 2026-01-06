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
                this.connectionError = 'No discovered identity to connect'
                throw new Error(this.connectionError)
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
                this.connectionError = 'Failed to connect (write identity)'
                this.isConnected = false
                throw new Error(this.connectionError)
            }

            // Update store fields used by Header and the rest of the app
            this.identityId = payload.identity_id
            this.username = payload.username
            this.identity = {
                id: payload.identity_id,
                idx: payload.identity_idx,
                username: payload.username
            }
            this.publicKeys = discovered.publicKeys ?? []
            this.revision =
                typeof payload.revision === 'number'
                    ? payload.revision
                    : Number(payload.revision || 0)
            this.isAuthenticated = true
            this.isConnected = true
            this.lastConnected = payload.created_at
            this.connectionError = null
        }
    }
}
