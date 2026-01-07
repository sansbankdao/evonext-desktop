// src/stores/identity/actions/connection.ts
import { ErrorBoundary } from '@/utils/errors'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { usePlatform } from '@/composables/usePlatform'
import type {
    ConnectionResult,
    IIdentityState,
    DiscoveredIdentity,
    IIdentity
} from '@/types'
export const connectionActions = () => ({
    /**
     * Initialize the store from storage (called on app start)
     */
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
                const mnemonicData = await this.loadMnemonic(network)
                if (!mnemonicData?.seedPhrase) throw new Error('No seed phrase found')
                const discovered = await this.loadDiscoveredIdentities(network)
                let targetIdx = 0
                if (discovered && discovered.identities && discovered.identities[targetIdentityId]) {
                    targetIdx = discovered.identities[targetIdentityId].identityIdx
                }
                await this.connectWithSeed(
                    mnemonicData.seedPhrase,
                    network,
                    targetIdentityId,
                    targetIdx
                )
                return { success: true, identityId: targetIdentityId }
            } catch(e: any) {
                this.connectionError = e.message
                return { success: false, error: e.message }
            } finally {
                this.isConnecting = false
            }
        }, 'SWITCH_IDENTITY_FAILED')
    },
    // Legacy Support for ConnectSeedForm - CORRECTED ORDER
    async connectWriteOnlyFromDiscovered(
        this: IIdentityState,
        identity: DiscoveredIdentity,
        seedPhrase: string
    ): Promise<ConnectionResult> {
        const network = await this.getCurrentNetwork()
        return this.connectWithSeed(
            seedPhrase,
            network,
            identity.identityId,
            identity.identityIdx
        )
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
                const purposeMap: Record<string, number> = {
                    AUTHENTICATION: 0, ENCRYPTION: 1, DECRYPTION: 2, TRANSFER: 3
                }
                const secMap: Record<string, number> = {
                    MASTER: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4
                }
                const now = new Date().toISOString()
                const privateKeyEntries: any[] = []
                for (let i = 0; i < publicKeys.length; i++) {
                    const pk = publicKeys[i] || {}
                    const keyId = Number(pk.id ?? i)
                    try {
                        const res = await KeyDerivationService.getPrivateKeyWASM(
                            seedPhrase,
                            network,
                            identityIndex,
                            keyId
                        )
                        const purposeStr = String(pk.purpose || 'AUTHENTICATION').toUpperCase()
                        const secStr = String(pk.securityLevel || 'MASTER').toUpperCase()
                        privateKeyEntries.push({
                            identityId: targetId,
                            keyId: keyId,
                            purpose: purposeMap[purposeStr] ?? 0,
                            securityLevel: secMap[secStr] ?? 0,
                            keyType: String(pk.keyType || pk.type || 'ECDSA_SECP256K1'),
                            privateKey: res.privateKey.WIF(),
                            publicKey: pk.data || '',
                            derivedFromMnemonic: true,
                            createdAt: now,
                            lastUsed: now
                        })
                    } catch (e) {
                        // Skip keys that fail derivation
                    }
                }
                if (privateKeyEntries.length > 0) {
                    await this.saveKeys(network, targetId, privateKeyEntries)
                }
                const activeIdentity: IIdentity = {
                    identityId: targetId,
                    identityIdx: identityIndex,
                    balance: identityData.balance ? String(identityData.balance) : '0',
                    revision: identityData.revision ? Number(identityData.revision) : 0,
                    publicKeys
                }
                this.isAuthenticated = true
                this.isConnected = true
                this.username = targetId
                this.identityId = targetId
                this.identity = activeIdentity
                this.publicKeys = publicKeys
                this.balance = activeIdentity.balance
                await this.saveToStorage(network)
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
        network: 'mainnet' | 'testnet' = 'mainnet',
        preloaded?: DiscoveredIdentity | null
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null
            try {
                const trimmedId = identityId.trim()
                if (!trimmedId) throw new Error('Identity ID is required')
                const { initialize, reset } = usePlatform()
                reset()
                await initialize({
                    network,
                    wallet: {
                        privateKey: privateKey,
                        unsafeOptions: { skipSynchronizationBeforeHeight: 950000 }
                    }
                })
                let identityData: any | null = null
                if (preloaded && preloaded.identityId === trimmedId) {
                    identityData = {
                        identityId: preloaded.identityId,
                        balance: preloaded.balance ?? '0',
                        revision: preloaded.revision ?? 0,
                        publicKeys: preloaded.publicKeys || []
                    }
                } else {
                    const fetchResult = await DAPIService.getIdentityById(trimmedId, network)
                    if (!fetchResult.success || !fetchResult.data) {
                        throw new Error(fetchResult.error || 'Failed to fetch identity details')
                    }
                    identityData = fetchResult.data
                }
                const publicKeys = identityData.publicKeys || []
                const now = new Date().toISOString()
                const firstAuthKey = publicKeys.find((pk: any) => (pk.purpose ?? pk.purposeNumber) === 0)
                const privateKeyEntry = {
                    identityId: trimmedId,
                    keyId: firstAuthKey?.id || 0,
                    purpose: 0,
                    securityLevel: 0,
                    keyType: String(firstAuthKey?.keyType || 'ECDSA_SECP256K1'),
                    privateKey: privateKey,
                    publicKey: firstAuthKey?.data || '',
                    derivedFromMnemonic: false,
                    createdAt: now,
                    lastUsed: now
                }
                await this.saveKeys(network, trimmedId, [privateKeyEntry])
                const activeIdentity: IIdentity = {
                    identityId: trimmedId,
                    identityIdx: 0,
                    balance: identityData.balance ? String(identityData.balance) : '0',
                    revision: identityData.revision ? Number(identityData.revision) : 0,
                    publicKeys
                }
                this.isAuthenticated = true
                this.isConnected = true
                this.username = trimmedId
                this.identityId = trimmedId
                this.identity = activeIdentity
                this.publicKeys = publicKeys
                this.balance = activeIdentity.balance
                await this.saveToStorage(network)
                return { success: true, identityId: trimmedId, identity: activeIdentity }
            } catch (err: any) {
                this.connectionError = err.message || 'Failed to connect'
                return { success: false, error: this.connectionError! }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_WITH_SINGLE_KEY_FAILED')
    },
    async logout(this: IIdentityState) {
        await this.clearStorage()
    },
    clearConnectionError(this: IIdentityState) {
        this.connectionError = null
    }
})
