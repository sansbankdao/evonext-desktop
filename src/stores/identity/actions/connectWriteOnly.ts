// src/stores/identity/actions/connectWriteOnly.ts

import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import type { ConnectionResult, DiscoveredIdentity, IIdentityState } from '@/types'

export function connectWriteOnlyActions() {
    return {
        async connectWriteOnlyFromDiscovered(
            this: IIdentityState,
            identity: DiscoveredIdentity,
            seedPhrase: string
        ): Promise<ConnectionResult> {
            if (!identity?.identityId || !seedPhrase) return { success: false, error: 'Missing input' }
            this.isConnecting = true
            this.connectionError = null
            try {
                const network = await this.getCurrentNetwork()
                const fetchResult = await DAPIService.getIdentityById(identity.identityId, network)
                let publicKeys = identity.publicKeys || []
                if (fetchResult.success && fetchResult.data) {
                    publicKeys = fetchResult.data.publicKeys || publicKeys
                }
                const privateKeyEntries: any[] = []
                for (let i = 0; i < publicKeys.length; i++) {
                    const pk = publicKeys[i]
                    const keyId = pk?.id !== undefined ? Number(pk.id) : i
                    if (keyId > 10) continue
                    try {
                        const res = await KeyDerivationService.getPrivateKeyWASM(
                            seedPhrase,
                            network,
                            identity.identityIdx || 0,
                            keyId
                        )
                        privateKeyEntries.push({
                            identityId: identity.identityId,
                            keyId,
                            purpose: Number(pk?.purpose ?? 0),
                            securityLevel: Number(pk?.securityLevel ?? 0),
                            keyType: String(pk?.keyType || 'ECDSA_HASH160'),
                            privateKey: res.privateKey.WIF(),
                            publicKey: pk?.data || binToHex(res.publicKeyBytes),
                            derivedFromMnemonic: true,
                            createdAt: new Date().toISOString()
                        })
                    } catch (e) { /* skip */ }
                }
                if (privateKeyEntries.length > 0) {
                    await this.saveKeys(network, identity.identityId, privateKeyEntries)
                }
                await this.saveMnemonicToStore(network, seedPhrase)
                this.isAuthenticated = true
                this.identityId = identity.identityId
                this.isConnected = true
                this.lastConnected = Date.now()
                return { success: true, identityId: identity.identityId }
            } catch (err: any) {
                const msg = err.message || 'Connection failed'
                this.connectionError = msg
                return { success: false, error: msg }
            } finally {
                this.isConnecting = false
            }
        }
    }
}
