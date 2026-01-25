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

/**
 * Persists the active identity ID as the Root Marker in Rust Storage.
 */
async function persistActiveIdentity(identityId: string | null, network: string) {
    try {
        // We update the marker via the specialized Rust command
        if (identityId) {
            await invoke('update_active_identity_marker', {
                network: network,
                activeId: identityId
            })
        }

        // Also update settings for generalized tracking
        const settings = await invoke<any>('load_settings').catch(() => null)
        if (settings) {
            settings.activeIdentityId = identityId
            await invoke('save_settings', { settings })
        }
        console.log(`[Source of Truth] Active Identity synced to Rust: ${identityId}`)
    } catch (e) {
        console.error('Failed to persist active identity to Rust:', e)
    }
}

export const connectionActions = () => ({
    async initFromStorage(this: IIdentityState) {
        return ErrorBoundary.wrap(async () => {
             await this.loadFromStorage()
        }, 'INIT_FROM_STORAGE_FAILED')
    },

    async switchIdentity(
        this: IIdentityState,
        targetIdentityId: string
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            try {
                const network = await this.getCurrentNetwork()

                const keystore: any = await invoke('load_private_keys', { network })
                const localEntries = keystore?.identities?.[targetIdentityId] || []
                const isSingleKeyIdentity = localEntries.some(
                    (e: any) => e.derivedFromMnemonic === false
                )

                if (isSingleKeyIdentity) {
                    const authEntry = localEntries.find((e: any) => e.purpose === 0)
                    if (!authEntry) throw new Error('No local authentication key found.')

                    return await this.connectWithSingleKey(
                        authEntry.privateKey,
                        targetIdentityId,
                        network
                    )
                }

                const mnemonicData = await this.loadMnemonic(network)
                if (!mnemonicData?.seedPhrase) {
                    throw new Error('No seed phrase found. Please reconnect.')
                }

                const discovered = await this.loadDiscoveredIdentities(network)
                let targetIdx = 0
                if (discovered?.identities?.[targetIdentityId]) {
                    targetIdx = discovered.identities[targetIdentityId].identityIdx
                }

                return await this.connectWithSeed(
                    mnemonicData.seedPhrase,
                    network,
                    targetIdentityId,
                    targetIdx
                )
            } finally {
                this.isConnecting = false
            }
        }, 'SWITCH_IDENTITY_FAILED')
    },

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

                // CHECK IF WE NEED TO RE-DERIVE KEYS (Source of Truth Check)
                const keystore: any = await invoke('load_private_keys', { network })
                const existingLocal = keystore?.identities?.[targetId] || []
                const isManualIdentity = existingLocal.some(
                    (e: any) => e.derivedFromMnemonic === false
                )

                if (!isManualIdentity) {
                    const now = new Date().toISOString()
                    const privateKeyEntries: any[] = []

                    for (let i = 0; i < publicKeys.length; i++) {
                        const pk = publicKeys[i]

                        // FIX: Calculate ID based on position if property is missing
                        const keyId = (pk.id !== undefined && pk.id !== null)
                            ? Number(pk.id)
                            : i

                        // Wallet standard derivation limit
                        if (keyId > 10) continue

                        try {
                            const res = await KeyDerivationService.getPrivateKeyWASM(
                                seedPhrase,
                                network,
                                identityIndex,
                                keyId
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
                                lastUsed: now
                            })
                        } catch (e) {
                            console.warn(`[Connect] Derivation failed for key ${keyId}`)
                        }
                    }

                    if (privateKeyEntries.length > 0) {
                        await this.saveKeys(network, targetId, privateKeyEntries)
                    }
                }

                const activeIdentity: IIdentity = {
                    identityId: targetId,
                    identityIdx: identityIndex,
                    balance: identityData.balance ? String(identityData.balance) : '0',
                    revision: identityData.revision ? Number(identityData.revision) : 0,
                    publicKeys
                }

                // Standardize Internal State
                this.isAuthenticated = true
                this.username = targetId
                this.identityId = targetId
                this.identity = activeIdentity
                this.publicKeys = publicKeys
                this.balance = activeIdentity.balance
                this.isConnected = true

                // SYNC TO RUST IDENTITY MAP
                await this.saveIdentityDataToStore(network, targetId, {
                    ...activeIdentity,
                    username: this.username,
                    active_identity_id: targetId // Sent to Rust to set the marker
                })

                await persistActiveIdentity(targetId, network)

                return { success: true, identityId: targetId, identity: activeIdentity }
            } catch (err: any) {
                this.connectionError = err.message || 'Failed to connect'
                return { success: false, error: this.connectionError! }
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
                if (!fetchResult.success || !fetchResult.data) {
                    throw new Error('Failed to fetch identity details')
                }

                const identityData = fetchResult.data
                const publicKeys = identityData.publicKeys || []

                // Save Single Key Entry
                const pkEntry = {
                    identityId: trimmedId,
                    keyId: 0,
                    purpose: 0,
                    securityLevel: 0,
                    keyType: 'ECDSA_HASH160',
                    privateKey,
                    publicKey: '', // Rust Command enrich_keystore will derive this
                    derivedFromMnemonic: false,
                    createdAt: new Date().toISOString(),
                    lastUsed: new Date().toISOString()
                }

                await this.saveKeys(network, trimmedId, [pkEntry])

                this.isAuthenticated = true
                this.username = trimmedId
                this.identityId = trimmedId
                this.identity = {
                    identityId: trimmedId,
                    identityIdx: 0,
                    balance: String(identityData.balance || '0'),
                    revision: Number(identityData.revision || 0),
                    publicKeys
                }
                this.publicKeys = publicKeys
                this.balance = this.identity.balance
                this.isConnected = true

                await this.saveIdentityDataToStore(network, trimmedId, {
                    ...this.identity,
                    active_identity_id: trimmedId
                })

                await persistActiveIdentity(trimmedId, network)

                return { success: true, identityId: trimmedId }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_WITH_SINGLE_KEY_FAILED')
    },

    async logout(this: IIdentityState) {
        const network = await this.getCurrentNetwork()
        await persistActiveIdentity(null, network)
        await this.clearStorage()
    },

    clearConnectionError(this: IIdentityState) {
        this.connectionError = null
    }
})
