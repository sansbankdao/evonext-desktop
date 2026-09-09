// src/services/identity/registration.service.ts

import {
    AssetLockProof,
    Identity,
    IdentityPublicKeyInCreation,
    IdentitySigner,
    KeyType,
    PrivateKey,
    Purpose,
    SecurityLevel,
} from '@dashevo/evo-sdk'
import { connectEvoSdk } from '@/services/platform'
import { KeyDerivationService } from './keyDerivation.service'
import { mnemonicManager } from '@/composables/useMnemonic'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import { debugLogger } from '@/utils/debugLogger'

const REGISTRAR_BASE = 'https://evonext.app/v1/registrar'

// v4 wasm enums are numeric — map our string constants to them
const PURPOSE_ENUM_MAP: Record<string, Purpose> = {
    AUTHENTICATION: Purpose.AUTHENTICATION,
    ENCRYPTION: Purpose.ENCRYPTION,
    DECRYPTION: Purpose.DECRYPTION,
    TRANSFER: Purpose.TRANSFER,
}
const SECURITY_LEVEL_ENUM_MAP: Record<string, SecurityLevel> = {
    MASTER: SecurityLevel.MASTER,
    CRITICAL: SecurityLevel.CRITICAL,
    HIGH: SecurityLevel.HIGH,
    MEDIUM: SecurityLevel.MEDIUM,
}
const KEY_TYPE_ENUM_MAP: Record<string, KeyType> = {
    ECDSA_SECP256K1: KeyType.ECDSA_SECP256K1,
    BLS12_381: KeyType.BLS12_381,
    ECDSA_HASH160: KeyType.ECDSA_HASH160,
}

// Local hex decode helper (no shared util exists for this in the repo)
function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
    return bytes
}

// SDK Constants
export const KeyTypeString = {
    ECDSA_SECP256K1: 'ECDSA_SECP256K1',
    BLS12_381: 'BLS12_381',
    ECDSA_HASH160: 'ECDSA_HASH160',
}

export const KeyPurposeString = {
    AUTHENTICATION: 'AUTHENTICATION',
    ENCRYPTION: 'ENCRYPTION',
    DECRYPTION: 'DECRYPTION',
    TRANSFER: 'TRANSFER',
}

export const SecurityLevelString = {
    MASTER: 'MASTER',
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
}

// EvoNext (Default) Layout for Dash Identity Keys
// Order matters here: [0, 1, 2, 3, 4] corresponds to derivation indices
export const DEFAULT_KEY_DEFINITIONS = [
    { type: KeyTypeString.ECDSA_HASH160, purpose: KeyPurposeString.AUTHENTICATION, level: SecurityLevelString.MASTER },
    { type: KeyTypeString.ECDSA_HASH160, purpose: KeyPurposeString.AUTHENTICATION, level: SecurityLevelString.CRITICAL },
    { type: KeyTypeString.ECDSA_HASH160, purpose: KeyPurposeString.AUTHENTICATION, level: SecurityLevelString.HIGH },
    { type: KeyTypeString.ECDSA_HASH160, purpose: KeyPurposeString.TRANSFER, level: SecurityLevelString.CRITICAL },
    { type: KeyTypeString.ECDSA_SECP256K1, purpose: KeyPurposeString.ENCRYPTION, level: SecurityLevelString.MEDIUM },
]

export class RegistrationService {
    /**
     * Step 1: Request a payment address from the registrar
     */
    static async getPaymentAddress(
        username: string,
        email: string = '',
        network: 'mainnet' | 'testnet'
    ): Promise<string> {
        const mnemonic = await mnemonicManager.getMnemonic(network)
        if (!mnemonic) throw new Error('Mnemonic not found')

        // Derive keys to get the Master Public Key for the request
        const derivation = await KeyDerivationService.deriveAllKeysFromSeed(mnemonic, network, 0, 1)
        if (!derivation[0] || !derivation[0].keys[0]) {
            throw new Error('Failed to derive master key')
        }

        const masterKey = derivation[0].keys[0].publicKey

        const body = JSON.stringify({
            masterKey,
            username,
            emailAddr: email,
            isMainnet: network === 'mainnet',
        })

        debugLogger.log(`[RegService] Requesting address for user: ${username}`, 'info')

        const response = await fetch(`${REGISTRAR_BASE}/address`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        })

        if (!response.ok) throw new Error('Failed to fetch payment address')

        const json = await response.json()
        return json.registrar.dashAddr as string
    }

    /**
     * Step 2: Poll the registrar for Asset Lock status
     */
    static async pollForProof(
        network: 'mainnet' | 'testnet'
    ): Promise<{ proof: string; wif: string } | null> {
        const mnemonic = await mnemonicManager.getMnemonic(network)
        if (!mnemonic) throw new Error('Mnemonic not found')

        const derivation = await KeyDerivationService.deriveAllKeysFromSeed(mnemonic, network, 0, 1)
        if (!derivation[0] || !derivation[0].keys[0]) {
            throw new Error('Failed to derive master key for status check')
        }

        const masterPublicKey = derivation[0].keys[0].publicKey

        const response = await fetch(`${REGISTRAR_BASE}/status`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${masterPublicKey}` },
        })

        if (!response.ok) return null

        const status = await response.json()

        if (status?.results?.[0]?.proof && status?.results?.[0]?.wif) {
            debugLogger.log('[RegService] Payment detected!', 'info')
            return {
                proof: status.results[0].proof,
                wif: status.results[0].wif
            }
        }
        return null
    }

    /**
     * Step 3: Execute Dash Platform Identity & Name Registration
     */
    static async registerOnPlatform(
        proof: string,
        wif: string,
        username: string,
        network: 'mainnet' | 'testnet'
    ): Promise<string> {
        const mnemonic = await mnemonicManager.getMnemonic(network)
        if (!mnemonic) throw new Error('Mnemonic not found')

        const derivation = await KeyDerivationService.deriveAllKeysFromSeed(mnemonic, network, 0, 1)
        if (!derivation[0] || derivation[0].keys.length < 5) {
            throw new Error('Insufficient keys derived for registration')
        }
        const derivedKeys = derivation[0].keys

        // Map keys to SDK format
        // Note: We use binToHex on the raw private key bytes
        const identityKeys = derivedKeys.map((key: any, idx: number) => {
            const def = DEFAULT_KEY_DEFINITIONS[idx]!
            return {
                keyType: def.type,
                purpose: def.purpose,
                securityLevel: def.level,
                // Ensure privateKey is a Wasm PrivateKeyWASM instance
                privateKeyHex: binToHex(key.privateKey.toBuffer())
            }
        })

        const sdk = await connectEvoSdk(network)
        debugLogger.log('[RegService] SDK Connected. Creating Identity...', 'info')

        try {
            // 1. Build the Asset Lock Proof (v4: typed object, not a raw string).
            // The registrar returns the proof as either JSON or hex — try JSON first.
            let assetLockProof: AssetLockProof
            try {
                assetLockProof = AssetLockProof.fromJSON(JSON.parse(proof))
            } catch {
                assetLockProof = AssetLockProof.fromHex(proof)
            }

            // Normalize ID retrieval (v4: deterministic from the asset lock proof)
            const identityId = assetLockProof.createIdentityId().toBase58()
            if (!identityId) throw new Error('Identity creation failed')

            // 2. Build the Identity object with all public keys.
            // ECDSA_HASH160 keys store the 20-byte pubkey hash; ECDSA_SECP256K1
            // keys store the compressed pubkey bytes.
            const identity = new Identity(identityId)
            derivedKeys.forEach((key: any, idx: number) => {
                const def = DEFAULT_KEY_DEFINITIONS[idx]!
                const isHash160 = def.type === KeyTypeString.ECDSA_HASH160
                const dataHex = isHash160 ? key.publicKeyHash : key.publicKey
                identity.addPublicKey(
                    new IdentityPublicKeyInCreation({
                        keyId: idx,
                        purpose: PURPOSE_ENUM_MAP[def.purpose]!,
                        securityLevel: SECURITY_LEVEL_ENUM_MAP[def.level]!,
                        keyType: KEY_TYPE_ENUM_MAP[def.type]!,
                        isReadOnly: false,
                        data: hexToBytes(dataHex),
                    }).toIdentityPublicKey()
                )
            })

            // 3. Create Identity.
            // identityCreate signs each public key with its corresponding private
            // key, so the signer must hold every derived key's WIF.
            const createSigner = new IdentitySigner()
            for (const key of derivedKeys) createSigner.addKeyFromWif(key.privateKey.toWIF())
            await sdk.identities.create({
                identity,
                assetLockProof,
                assetLockPrivateKey: PrivateKey.fromWIF(wif),
                signer: createSigner,
            })

            debugLogger.log(`[RegService] Identity created: ${identityId}. Registering DPNS...`, 'info')

            // 2. Find the CRITICAL Authentication Key for signing the DPNS contract
            // We do NOT rely on index 1, we search the definitions.
            const criticalAuthKey = identityKeys.find(
                (key: any) => key.purpose === KeyPurposeString.AUTHENTICATION && key.securityLevel === SecurityLevelString.CRITICAL
            )

            if (!criticalAuthKey) {
                throw new Error('Could not find CRITICAL authentication key to sign registration.')
            }

            // 3. Find the corresponding PRIVATE key to sign the transaction
            const signingKey = derivedKeys.find((_key: any, idx: number) => {
                const def = DEFAULT_KEY_DEFINITIONS[idx]!
                return def.purpose === KeyPurposeString.AUTHENTICATION && def.level === SecurityLevelString.CRITICAL
            })

            if (!signingKey) {
                throw new Error('Could not find derived private key for signing.')
            }

            // 4. Register DPNS name (v4: { label, identity, identityKey, signer })
            const identityKey = identity.getPublicKeyById(identityKeys.indexOf(criticalAuthKey))
            if (!identityKey) {
                throw new Error('Could not find CRITICAL authentication key to sign registration.')
            }
            const dpnsSigner = new IdentitySigner()
            dpnsSigner.addKeyFromWif(signingKey.privateKey.toWIF())
            await sdk.dpns.registerName({
                label: username,
                identity,
                identityKey,
                signer: dpnsSigner,
            })

            return identityId
        } catch (e: any) {
            debugLogger.log(`[RegService] Platform Registration Error: ${e.message}`, 'error')
            throw e
        }
    }
}
