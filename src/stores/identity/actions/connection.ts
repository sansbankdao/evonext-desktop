// src/stores/identity/actions/connection.ts

import { invoke } from '@tauri-apps/api/core'
import { ErrorBoundary } from '@/utils/errors'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { usePlatform } from '@/composables/usePlatform'
import type {
    ConnectionResult,
    IIdentityState,
    // DiscoveredIdentity,
    IIdentity
} from '@/types'
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
export const connectionActions = () => ({
    async connectWithSeed(
        this: IIdentityState,
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'mainnet',
        targetId: string,
        identityIndex: number = 0
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null
            try {
                const { initialize, reset } = usePlatform()
                reset()
                await initialize({
                    network,
                    wallet: {
                        mnemonic: seedPhrase,
                        unsafeOptions: { skipSynchronizationBeforeHeight: 950000 }
                    }
                })
                await this.saveMnemonicToStore(network, seedPhrase)
                const fetchResult = await DAPIService.getIdentityById(targetId, network)
                if (!fetchResult.success || !fetchResult.data) {
                    throw new Error(fetchResult.error || `Failed to fetch identity ${targetId}`)
                }
                const identityData = fetchResult.data
                const publicKeys = identityData.publicKeys || []
                // Key Derivation Loop
                const now = new Date().toISOString()
                const privateKeyEntries: any[] = []
                for (let i = 0; i < publicKeys.length; i++) {
                    const pk = publicKeys[i]
                    const keyId = (pk.id !== undefined && pk.id !== null) ? Number(pk.id) : i
                    if (keyId > 10) continue
                    try {
                        const res = await KeyDerivationService.getPrivateKeyWASM(
                            seedPhrase, network, identityIndex, keyId
                        )
                        privateKeyEntries.push({
                            identityId: targetId,
                            keyId: keyId,
                            purpose: Number(pk.purpose ?? 0),
                            securityLevel: Number(pk.securityLevel ?? 0),
                            keyType: String(pk.keyType || pk.type || 'ECDSA_HASH160'),
                            privateKey: res.privateKey.WIF(),
                            publicKey: pk.data || '',
                            derivedFromMnemonic: true,
                            createdAt: now,
                            last_used: now
                        })
                    } catch (e) {
                        console.warn(`[Connect] KeyId ${keyId} derivation skipped`)
                    }
                }
                if (privateKeyEntries.length > 0) {
                    await this.saveKeys(network, targetId, privateKeyEntries)
                }
                const activeIdentity: IIdentity = {
                    identityId: targetId,
                    identityIdx: identityIndex,
                    balance: String(identityData.balance || '0'),
                    revision: Number(identityData.revision || 0),
                    publicKeys
                }
                // Update RAM
                this.isAuthenticated = true
                this.username = targetId
                this.identityId = targetId
                this.identity = activeIdentity
                this.publicKeys = publicKeys
                this.balance = activeIdentity.balance
                this.isConnected = true
                // SYNC TO DISK
                await this.saveIdentityDataToStore(network, targetId, {
                    ...activeIdentity,
                    active_identity_id: targetId
                })
                await persistActiveIdentityMarker(targetId, network)
                return { success: true, identityId: targetId, identity: activeIdentity }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_WITH_SEED_FAILED')
    },
    async connectWithSingleKey(
        this: IIdentityState,
        privateKey: string,
        identityId: string,
        network: 'mainnet' | 'testnet' = 'mainnet'
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            try {
                const trimmedId = identityId.trim()
                const { initialize, reset } = usePlatform()
                reset()
                await initialize({
                    network,
                    wallet: { privateKey, unsafeOptions: { skipSynchronizationBeforeHeight: 950000 } }
                })
                const fetchResult = await DAPIService.getIdentityById(trimmedId, network)
                if (!fetchResult.success || !fetchResult.data) throw new Error('DAPI Fetch failed')
                const identityData = fetchResult.data
                const publicKeys = identityData.publicKeys || []
                const pkEntry = {
                    identityId: trimmedId,
                    keyId: 0,
                    purpose: 0,
                    securityLevel: 0,
                    keyType: 'ECDSA_HASH160',
                    private_key: privateKey,
                    public_key: '',
                    derived_from_mnemonic: false,
                    created_at: new Date().toISOString(),
                    last_used: new Date().toISOString()
                }
                await this.saveKeys(network, trimmedId, [pkEntry])
                this.isAuthenticated = true
                this.identityId = trimmedId
                this.identity = {
                    identityId: trimmedId,
                    identityIdx: 0,
                    balance: String(identityData.balance || '0'),
                    revision: Number(identityData.revision || 0),
                    publicKeys
                }
                this.balance = String(identityData.balance || '0')
                this.isConnected = true
                await this.saveIdentityDataToStore(network, trimmedId, {
                    ...this.identity,
                    active_identity_id: trimmedId
                })
                await persistActiveIdentityMarker(trimmedId, network)
                return { success: true, identityId: trimmedId }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_WITH_SINGLE_KEY_FAILED')
    }
})
