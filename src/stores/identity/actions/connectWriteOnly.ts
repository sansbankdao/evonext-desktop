// src/stores/identity/action/connectWriteOnly.ts

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
// Mapping for DAPI string enums to numeric codes used internally
const PURPOSE_MAP: Record<string, number> = {
    'AUTHENTICATION':0,    'ENCRYPTION': 1,
    'DECRYPTION': 2,
    'TRANSFER': 3,
}
const SECURITY_LEVEL_MAP: Record<string, number> = {
    'MASTER': 0,
    'CRITICAL': 1,
    'HIGH': 2,
    'MEDIUM': 3,
}
export function connectWriteOnlyActions() {
    return {
        async connectWriteOnlyFromDiscovered(
            this: IIdentityState,
            identity: DiscoveredIdentity,
            seedPhrase: string
        ): Promise<ConnectionResult> {
            // Debug logging
            const logToHUD = (level: string, message: any) => {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('discovery:log', {
                        detail: { level, message, source: 'connectWriteOnly' }
                    }))
                }
            }
            logToHUD('DEBUG', '[ConnectWriteOnly] Starting connection...')
            logToHUD('DEBUG', `Identity ID: ${identity?.identityId || 'none'}`)
            logToHUD('DEBUG', `Seed phrase length: ${seedPhrase?.split(' ')?.length || 0} words`)
            if (!identity?.identityId) {
                logToHUD('ERROR', 'No discovered identity')
                this.connectionError = 'No discovered identity'
                return { success: false, error: this.connectionError }
            }
            if (!seedPhrase) {
                logToHUD('ERROR', 'Seed phrase is required for connection')
                this.connectionError = 'Seed phrase is required for connection'
                return { success: false, error: this.connectionError }
            }
            this.isConnecting = true
            this.connectionError = null
            try {
                const network = (this as any).currentNetwork || 'testnet'
                const dashNetwork = network as 'mainnet' | 'testnet'
                logToHUD('DEBUG', `Fetching identity details from DAPI for ${identity.identityId}...`)
                const fetchResult = await DAPIService.getIdentityById(identity.identityId, dashNetwork)
                logToHUD('DEBUG', `DAPI fetch result: success=${fetchResult.success}, hasData=${!!fetchResult.data}`)
                const rawKeys = (fetchResult.success && fetchResult.data && fetchResult.data.publicKeys)
                    ? fetchResult.data.publicKeys
                    : []
                logToHUD('DEBUG', `Found ${rawKeys.length} public keys`)
                // Helper function to parse purpose/securityLevel
                const parsePurpose = (value: any): number => {
                    if (typeof value === 'number') return value
                    if (typeof value === 'string') return PURPOSE_MAP[value.toUpperCase()] ?? 0
                    return 0
                }
                const parseSecurityLevel = (value: any): number => {
                    if (typeof value === 'number') return value
                    if (typeof value === 'string') return SECURITY_LEVEL_MAP[value.toUpperCase()] ?? 3
                    return 3
                }
                const mappedPublicKeys: IPublicKey[] = (rawKeys || []).map((pk: any, loopIdx: number) => ({
                    idx: pk.idx !== undefined ? pk.idx : (pk.id !== undefined ? pk.id : loopIdx),
                    keyType: pk.keyType || 'ECDSA_HASH160',
                    purpose: parsePurpose(pk.purpose) as any,
                    securityLevel: parseSecurityLevel(pk.securityLevel) as any,
                    data: pk.data || '',
                    readOnly: pk.readOnly || false,
                    disabledAt: pk.disabledAt || null
                }))
                logToHUD('DEBUG', `Mapped ${mappedPublicKeys.length} public keys`)
                const privateKeyEntries: any[] = []
                for (let i = 0; i < mappedPublicKeys.length; i++) {
                    const pk = mappedPublicKeys[i]!
                    if (pk.idx > 20) continue
                    try {
                        logToHUD('DEBUG', `Deriving key ${pk.idx} for identity index ${identity.identityIdx || 0}...`)
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
                            logToHUD('DEBUG', `Successfully derived key ${pk.idx}`)
                        } else {
                            logToHUD('WARN', `Failed to derive key ${pk.idx}: no private key returned`)
                        }
                    } catch (e: any) {
                        logToHUD('WARN', `Derivation failed for key index ${pk.idx}: ${e.message || e}`)
                    }
                }
                logToHUD('DEBUG', `Derived ${privateKeyEntries.length} private keys`)
                if (privateKeyEntries.length > 0) {
                    logToHUD('DEBUG', `Saving ${privateKeyEntries.length} keys to keystore...`)
                    await (this as any).saveKeys(dashNetwork, identity.identityId, privateKeyEntries)
                } else {
                    logToHUD('WARN', 'No private keys derived - connection may be read-only')
                }
                logToHUD('DEBUG', 'Saving mnemonic to store...')
                await (this as any).saveMnemonicToStore(dashNetwork, seedPhrase)
                logToHUD('DEBUG', 'Updating store state...')
                this.identityId = identity.identityId
                this.publicKeys = mappedPublicKeys
                this.balance = identity.balance || '0'
                this.isAuthenticated = true
                this.isConnected = true
                logToHUD('SUCCESS', `Successfully connected as ${identity.identityId}`)
                return { success: true, identityId: identity.identityId }
            } catch (err: any) {
                const msg = err.message || 'Connection failed'
                logToHUD('ERROR', `Connection failed: ${msg}`)
                logToHUD('DEBUG', `Stack trace: ${err.stack || 'No stack trace'}`)
                this.connectionError = msg
                return { success: false, error: msg }
            } finally {
                this.isConnecting = false
            }
        }
    }
}
