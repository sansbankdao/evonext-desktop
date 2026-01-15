// src/services/identity/registration.service.ts

import { EvoSDK } from '@dashevo/evo-sdk'
import { KeyDerivationService } from './keyDerivation.service'
import { mnemonicManager } from '@/composables/useMnemonic'
// @ts-ignore
import { binToHex } from '@evonext/utils'
import { debugLogger } from '@/utils/debugLogger'

const REGISTRAR_BASE = 'https://evonext.app/v1/registrar'

// SDK Constants
export const KeyTypeString = {
    ECDSA_SECP256K1: 'ECDSA_SECP256K1',
    BLS12_381: 'BLS12_381',
    ECDSA_HASH160: 'ECDSA_HASH160',
}

export const KeyPurposeString = {
    AUTHENTICATION: 'AUTHENTICATION',
    TRANSFER: 'TRANSFER',
    ENCRYPTION: 'ENCRYPTION',
}

export const SecurityLevelString = {
    MASTER: 'MASTER',
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
}

// Standard Layout for Dash Identity Keys
// Order matters here: [0, 1, 2, 3, 4] corresponds to derivation indices
export const KEY_DEFINITIONS = [
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
        const identityKeys = derivedKeys.map((key, idx) => {
            const def = KEY_DEFINITIONS[idx]!
            return {
                keyType: def.type,
                purpose: def.purpose,
                securityLevel: def.level,
                // Ensure privateKey is a Wasm PrivateKeyWASM instance
                privateKeyHex: binToHex(key.privateKey.toBuffer())
            }
        })

        const sdk = network === 'mainnet' ? EvoSDK.mainnetTrusted() : EvoSDK.testnetTrusted()

        // Connect to the network (SDK keeps connection open)
        await sdk.connect()
        debugLogger.log('[RegService] SDK Connected. Creating Identity...', 'info')

        try {
            // 1. Create Identity
            // We must cast to 'any' here because the SDK types expect 'unknown[]'
            // but the runtime implementation actually accepts a JSON string.
            const identity = await sdk.identities.create({
                assetLockProof: proof,
                assetLockPrivateKeyWif: wif,
                publicKeys: JSON.stringify(identityKeys) as any,
            })

            // Normalize ID retrieval
            const identityId = identity.getId()
            if (!identityId) throw new Error('Identity creation failed')

            debugLogger.log(`[RegService] Identity created: ${identityId}. Registering DPNS...`, 'info')

            // 2. Find the CRITICAL Authentication Key for signing the DPNS contract
            // We do NOT rely on index 1, we search the definitions.
            const criticalAuthKey = identityKeys.find(
                k => k.purpose === KeyPurposeString.AUTHENTICATION && k.securityLevel === SecurityLevelString.CRITICAL
            )

            if (!criticalAuthKey) {
                throw new Error('Could not find CRITICAL authentication key to sign registration.')
            }

            // 3. Find the corresponding PRIVATE key to sign the transaction
            const signingKey = derivedKeys.find((_k, idx) => {
                const def = KEY_DEFINITIONS[idx]!
                return def.purpose === KeyPurposeString.AUTHENTICATION && def.level === SecurityLevelString.CRITICAL
            })

            if (!signingKey) {
                throw new Error('Could not find derived private key for signing.')
            }

            // 4. Register DPNS name
            await sdk.dpns.registerName({
                label: username,
                identityId,
                // publicKeyId: The index of the key in the identityKeys array
                // We use the index found in our identityKeys map
                publicKeyId: identityKeys.indexOf(criticalAuthKey),
                privateKeyWif: signingKey.privateKey.toWIF(),
            })

            return identityId
        } catch (e: any) {
            debugLogger.log(`[RegService] Platform Registration Error: ${e.message}`, 'error')
            throw e
        }
    }
}
