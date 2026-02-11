// src/stores/identity/actions/connection.ts

import { invoke } from '@/utils/tauri'
import { ErrorBoundary } from '@/utils/errors'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { usePlatform } from '@/composables/usePlatform'
import type { ConnectionResult, IIdentity, IPublicKey } from '@/types'
export const connectionActions = () => ({
    async connectWithSeed(
        this: any,
        seedPhrase: string,
        network: 'mainnet' | 'testnet' = 'testnet',
        targetId: string,
        identityIndex: number = 0
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            this.connectionError = null
            try {
                const { initialize, reset } = usePlatform()
                await reset()
                await initialize({
                    network,
                    wallet: { mnemonic: seedPhrase }
                })
                await this.saveMnemonicToStore(network, seedPhrase)
                const fetchResult = await DAPIService.getIdentityById(targetId, network)
                if (!fetchResult.success || !fetchResult.data) {
                    throw new Error(fetchResult.error || 'Identity not found')
                }
                const identityData = fetchResult.data
                const dapiKeys = identityData.publicKeys || []
                const privateKeyEntries: any[] = []
                // Map DAPI Keys to IPublicKey (adding 'id' index)
                const mappedPublicKeys: IPublicKey[] = dapiKeys.map((pk, idx) => ({
                    keyType: pk.keyType,
                    purpose: pk.purpose as any,
                    securityLevel: pk.securityLevel as any,
                    data: pk.data,
                    readOnly: pk.readOnly,
                    disabledAt: pk.disabledAt
                }))
                // Derivation
                for (let i = 0; i < mappedPublicKeys.length; i++) {
                    const pk = mappedPublicKeys[i]!
                    try {
                        const res = await KeyDerivationService.getPrivateKeyWASM(
                            seedPhrase, network, identityIndex, pk.id
                        )
                        privateKeyEntries.push({
                            identityId: targetId,
                            keyId: pk.id,
                            purpose: pk.purpose,
                            securityLevel: pk.securityLevel,
                            keyType: pk.keyType,
                            privateKey: res.privateKey.WIF(),
                            publicKey: pk.data,
                            createdAt: new Date().toISOString()
                        })
                    } catch (e) { /* skip */ }
                }
                const identityPayload: IIdentity = {
                    identityId: targetId,
                    identityIdx: identityIndex,
                    balance: String(identityData.balance),
                    revision: Number(identityData.revision),
                    publicKeys: mappedPublicKeys
                }
                await this.saveIdentityWithKeys(network, identityPayload, privateKeyEntries)
                // Update Store State
                this.identityId = targetId
                this.identity = identityPayload
                this.publicKeys = mappedPublicKeys
                this.balance = identityPayload.balance
                this.revision = identityPayload.revision
                this.isAuthenticated = true
                this.isConnected = true
                return { success: true, identityId: targetId, identity: identityPayload }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_FAILED')
    },
    async connectWithSingleKey(
        this: any,
        privateKey: string,
        identityId: string,
        network: 'mainnet' | 'testnet' = 'testnet'
    ): Promise<ConnectionResult> {
        return ErrorBoundary.wrap(async () => {
            this.isConnecting = true
            try {
                const fetchResult = await DAPIService.getIdentityById(identityId, network)
                if (!fetchResult.success || !fetchResult.data) throw new Error('DAPI Fetch failed')
                const identityData = fetchResult.data
                const mappedPublicKeys: IPublicKey[] = (identityData.publicKeys || []).map((pk, idx) => ({
                    keyType: pk.keyType,
                    purpose: pk.purpose as any,
                    securityLevel: pk.securityLevel as any,
                    data: pk.data,
                    readOnly: pk.readOnly,
                    disabledAt: pk.disabledAt
                }))
                this.identityId = identityId
                this.publicKeys = mappedPublicKeys
                this.balance = String(identityData.balance)
                this.isAuthenticated = true
                this.isConnected = true
                return { success: true, identityId }
            } finally {
                this.isConnecting = false
            }
        }, 'CONNECT_KEY_FAILED')
    }
})
