// src/stores/identity/actions/connectWriteOnly.ts

import { invoke } from '@/utils/tauri'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import type { ConnectionResult, DiscoveredIdentity, IIdentityState, IIdentity } from '@/types'
import type { IPrivateKeyEntry } from '@/types'

async function persistActiveIdentityMarker(identityId: string | null, network: string) {
    try {
        if (identityId) {
            await invoke('update_active_identity_marker', {
                network: network,
                activeId: identityId
            })
        }
    } catch (e) {
        console.error('Failed to persist active identity marker:', e)
    }
}

export function connectWriteOnlyActions() {
    return {
        /**
         * Connect using a discovered identity and seed phrase.
         * This derives all keys from the mnemonic and saves them to the keystore.
         */
        async connectWriteOnlyFromDiscovered(
            this: IIdentityState,
            identity: DiscoveredIdentity,
            seedPhrase: string
        ): Promise<ConnectionResult> {
            if (!identity || !identity.identityId) {
                this.connectionError = 'No discovered identity to connect'
                return { success: false, error: this.connectionError }
            }

            if (!seedPhrase || seedPhrase.trim().length === 0) {
                this.connectionError = 'Seed phrase is required'
                return { success: false, error: this.connectionError }
            }

            this.isConnecting = true
            this.connectionError = null

            try {
                // Determine network from settings
                const network = await this.getCurrentNetwork()
                const identityIndex = identity.identityIdx ?? 0

                // Fetch fresh identity data from DAPI to get public keys
                const fetchResult = await DAPIService.getIdentityById(identity.identityId, network)

                let publicKeys = identity.publicKeys || []
                let balance = identity.balance
                let revision = identity.revision

                if (fetchResult.success && fetchResult.data) {
                    publicKeys = fetchResult.data.publicKeys || publicKeys
                    balance = fetchResult.data.balance ?? balance
                    revision = fetchResult.data.revision ?? revision
                }

                // Derive private keys from seed phrase for each public key
                const now = new Date().toISOString()
                const privateKeyEntries: IPrivateKeyEntry[] = []

                for (let i = 0; i < publicKeys.length; i++) {
                    const pk = publicKeys[i]
                    const keyId = (pk?.id !== undefined && pk.id !== null) ? Number(pk.id) : i

                    // Skip high key IDs (likely not derived from standard path)
                    if (keyId > 10) continue

                    try {
                        const res = await KeyDerivationService.getPrivateKeyWASM(
                            seedPhrase,
                            network,
                            identityIndex,
                            keyId
                        )

                        privateKeyEntries.push({
                            identityId: identity.identityId,
                            keyId: keyId,
                            purpose: Number(pk?.purpose ?? 0),
                            securityLevel: Number(pk?.securityLevel ?? 0),
                            keyType: String(pk?.keyType || pk?.type || 'ECDSA_HASH160'),
                            // Use the WIF from the wrapped key
                            privateKey: res.privateKey.WIF(),
                            publicKey: pk?.data || binToHex(res.publicKeyBytes), // Use the raw bytes from SDK
                            derivedFromMnemonic: true,
                            created_at: now,
                            last_used: now
                        })
                    } catch (e) {
                        console.warn(`[connectWriteOnly] KeyId ${keyId} derivation skipped:`, e)
                    }
                }

                // FIX: Use the batch 'save_keys' command (plural) instead of loop.
                if (privateKeyEntries.length > 0) {
                    await invoke('save_keys', {
                        network,
                        identityId: identity.identityId,
                        keys: privateKeyEntries
                    })
                }

                // Save mnemonic for future use
                await this.saveMnemonicToStore(network, seedPhrase)

                // Build the active identity object
                const activeIdentity: IIdentity = {
                    identityId: identity.identityId,
                    identityIdx: identityIndex,
                    balance: balance != null ? String(balance) : '0',
                    revision: typeof revision === 'number' ? revision : Number(revision || 0),
                    publicKeys: publicKeys,
                    username: identity.dpnsUsername || identity.username || identity.identityId,
                    displayName: identity.displayName || identity.dpnsUsername || ''
                }

                // Update store state
                this.isAuthenticated = true
                this.username = activeIdentity.username || null
                this.identityId = identity.identityId
                this.identity = activeIdentity
                this.publicKeys = publicKeys
                this.balance = activeIdentity.balance
                this.revision = activeIdentity.revision ?? null
                this.isConnected = true
                this.lastConnected = Date.now()
                this.connectionError = null

                // Persist identity data to disk
                await this.saveIdentityDataToStore(network, identity.identityId, {
                    ...activeIdentity,
                    active_identity_id: identity.identityId
                })

                // Mark as active identity
                await persistActiveIdentityMarker(identity.identityId, network)

                return {
                    success: true,
                    identityId: identity.identityId,
                    identity: activeIdentity
                }

            } catch (err: any) {
                const errorMsg = err?.message || String(err) || 'Failed to connect'
                console.error('[connectWriteOnly] Error:', errorMsg)
                this.connectionError = errorMsg
                this.isConnected = false
                return { success: false, error: errorMsg }
            } finally {
                this.isConnecting = false
            }
        }
    }
}
