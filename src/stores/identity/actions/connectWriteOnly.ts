// src/stores/identity/actions/connectWriteOnly.ts

import { invoke } from '@/utils/tauri'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import type { ConnectionResult, DiscoveredIdentity, IIdentityState, IIdentity } from '@/types'
// import type { IPrivateKeyEntry } from '@/types'
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
                const network = await this.getCurrentNetwork()
                const identityIndex = identity.identityIdx ?? 0
                const fetchResult = await DAPIService.getIdentityById(identity.identityId, network)
                let publicKeys = identity.publicKeys || []
                let balance = identity.balance
                let revision = identity.revision
                if (fetchResult.success && fetchResult.data) {
                    publicKeys = fetchResult.data.publicKeys || publicKeys
                    balance = fetchResult.data.balance ?? balance
                    revision = fetchResult.data.revision ?? revision
                }
                const now = new Date().toISOString()
                const privateKeyEntries: any[] = []
                for (let i = 0; i < publicKeys.length; i++) {
                    const pk = publicKeys[i]
                    const keyId = pk?.id !== undefined ? Number(pk.id) : i
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
                            privateKeyWIF: res.privateKey.WIF(),
                            publicKeyHex: pk?.data || binToHex(res.publicKeyBytes),
                            createdAt: now,
                            lastUsed: now
                        })
                    } catch (e) {
                        console.warn(`KeyId ${keyId} derivation skipped:`, e)
                    }
                }
                // IMPORTANT: Use the store action so the test mock is triggered
                if (privateKeyEntries.length > 0) {
                    await this.saveKeys(network, identity.identityId, privateKeyEntries)
                }
                await this.saveMnemonicToStore(network, seedPhrase)
                const activeIdentity: IIdentity = {
                    identityId: identity.identityId,
                    identityIdx: identityIndex,
                    balance: balance != null ? String(balance) : '0',
                    revision: Number(revision || 0),
                    publicKeys: publicKeys,
                    username: identity.dpnsUsername || identity.username || identity.identityId,
                    displayName: identity.displayName || identity.dpnsUsername || ''
                }
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
                await this.saveIdentityDataToStore(network, identity.identityId, {
                    ...activeIdentity,
                    active_identity_id: identity.identityId
                })
                await persistActiveIdentityMarker(identity.identityId, network)
                return {
                    success: true,
                    identityId: identity.identityId,
                    identity: activeIdentity
                }
            } catch (err: any) {
                const errorMsg = err?.message || 'Failed to connect'
                this.connectionError = errorMsg
                this.isConnected = false
                return { success: false, error: errorMsg }
            } finally {
                this.isConnecting = false
            }
        }
    }
}
