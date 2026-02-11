// src/stores/identity/actions/connectWriteOnly.ts

import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import type {
    ConnectionResult,
    DiscoveredIdentity,
    IIdentityState,
    IPublicKey
} from '@/types'
export function connectWriteOnlyActions() {
    return {
        async connectWriteOnlyFromDiscovered(
            this: IIdentityState,
            identity: DiscoveredIdentity,
            seedPhrase: string
        ): Promise<ConnectionResult> {
            if (!identity?.identityId) {
                this.connectionError = 'No discovered identity provided'
                return { success: false, error: this.connectionError }
            }
            if (!seedPhrase) {
                this.connectionError = 'Seed phrase is required for connection'
                return { success: false, error: this.connectionError }
            }
            this.isConnecting = true
            this.connectionError = null
            try {
                // Ensure currentNetwork is treated as the correct Union type
                const network = (this as any).currentNetwork || 'testnet'
                const dashNetwork = network as 'mainnet' | 'testnet'
                const fetchResult = await DAPIService.getIdentityById(identity.identityId, dashNetwork)
                // Use fetched keys if available, otherwise fallback to discovery data
                const rawKeys = (fetchResult.success && fetchResult.data)
                    ? fetchResult.data.publicKeys
                    : []
                // Map raw DAPI keys to standardized IPublicKey
                const mappedPublicKeys: IPublicKey[] = rawKeys.map((pk: any, loopIdx: number) => ({
                    // FIX: Check for .idx first, then .id, then fallback to loop index
                    idx: pk.idx !== undefined ? pk.idx : (pk.id !== undefined ? pk.id : loopIdx),
                    keyType: pk.keyType || 'ECDSA_HASH160',
                    purpose: Number(pk.purpose ?? 0) as any,
                    securityLevel: Number(pk.securityLevel ?? 0) as any,
                    data: pk.data || '',
                    readOnly: pk.readOnly || false,
                    disabledAt: pk.disabledAt || null
                }))
                const privateKeyEntries: any[] = []
                for (let i = 0; i < mappedPublicKeys.length; i++) {
                    const pk = mappedPublicKeys[i]!
                    if (pk.idx > 20) continue
                    try {
                        const res = await KeyDerivationService.getPrivateKeyWASM(
                            seedPhrase,
                            dashNetwork,
                            identity.identityIdx || 0,
                            pk.idx
                        )
                        if (res?.privateKey) {
                            privateKeyEntries.push({
                                identityId: identity.identityId,
                                keyId: pk.idx,
                                purpose: pk.purpose,
                                securityLevel: pk.securityLevel,
                                keyType: pk.keyType,
                                privateKey: res.privateKey.WIF(),
                                publicKey: pk.data || (res.publicKeyBytes ? binToHex(res.publicKeyBytes) : ''),
                                derivedFromMnemonic: true,
                                createdAt: new Date().toISOString()
                            })
                        }
                    } catch (e) {
                        console.warn(`[ConnectWriteOnly] Derivation failed for key index ${pk.idx}`)
                    }
                }
                if (privateKeyEntries.length > 0) {
                    await (this as any).saveKeys(dashNetwork, identity.identityId, privateKeyEntries)
                }
                await (this as any).saveMnemonicToStore(dashNetwork, seedPhrase)
                // Update RAM State
                this.identityId = identity.identityId
                this.publicKeys = mappedPublicKeys
                this.balance = identity.balance || '0'
                this.isAuthenticated = true
                this.isConnected = true
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
