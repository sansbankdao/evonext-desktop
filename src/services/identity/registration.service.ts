// src/services/identity/registration.service.ts

// import { invoke } from '@tauri-apps/api/core'
// import { useIdentityStore } from '@/stores/identity'
import { EvoSDK } from '@dashevo/evo-sdk'
import { KeyDerivationService } from './keyDerivation.service'
import { mnemonicManager } from '@/composables/useMnemonic'

const REGISTRAR_BASE = 'https://evonext.app/v1/registrar'

export const KEY_DEFINITIONS = [
    { id: 0, purpose: 0, securityLevel: 0 }, // MASTER
    { id: 1, purpose: 0, securityLevel: 1 }, // CRITICAL
    { id: 2, purpose: 0, securityLevel: 2 }, // HIGH
    { id: 3, purpose: 3, securityLevel: 1 }, // TRANSFER
    { id: 4, purpose: 1, securityLevel: 3 }, // ENCRYPTION
]

export class RegistrationService {
    /**
     * Request a payment address from the registrar
     */
    static async getPaymentAddress(username: string, email: string = '', network: 'mainnet' | 'testnet') {
        const mnemonic = await mnemonicManager.getMnemonic()
        if (!mnemonic) throw new Error('Mnemonic not found')
        const derivation = await KeyDerivationService.deriveAllKeysFromSeed(mnemonic, network, 0, 1)
        // Safety check for array access
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
        const response = await fetch(`${REGISTRAR_BASE}/address`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        })
        const json = await response.json()
        return json.registrar.dashAddr as string
    }

    /**
     * Poll the registrar for Asset Lock status
     */
    static async pollForProof(network: 'mainnet' | 'testnet'): Promise<{ proof: string; wif: string } | null> {
        const mnemonic = await mnemonicManager.getMnemonic()
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
        const status = await response.json()
        if (status?.results?.[0]?.proof && status?.results?.[0]?.wif) {
            return {
                proof: status.results[0].proof,
                wif: status.results[0].wif
            }
        }
        return null
    }

    /**
     * Execute Dash Platform Identity & Name Registration
     */
    static async registerOnPlatform(
        proof: string,
        wif: string,
        username: string,
        network: 'mainnet' | 'testnet'
    ) {
        const mnemonic = await mnemonicManager.getMnemonic()
        if (!mnemonic) throw new Error('Mnemonic not found')
        const derivation = await KeyDerivationService.deriveAllKeysFromSeed(mnemonic, network, 0, 1)
        if (!derivation[0] || derivation[0].keys.length < 5) {
            throw new Error('Insufficient keys derived for registration')
        }
        const derivedKeys = derivation[0].keys
        // Fix: Map to objects instead of stringifying.
        // SDK expects an array of objects matching the IdentityPublicKey schema
        const publicKeysForSdk = derivedKeys.map((key, idx) => {
            const definition = KEY_DEFINITIONS[idx]
            if (!definition) throw new Error(`Missing definition for key index ${idx}`)
            return {
                data: key.publicKey, // The hex string of the public key
                type: 0,             // ECDSA_SECP256K1
                purpose: definition.purpose,
                securityLevel: definition.securityLevel,
                readOnly: false
            }
        })
        const sdk = network === 'mainnet' ? EvoSDK.mainnetTrusted() : EvoSDK.testnetTrusted()
        await sdk.connect()
        // 1. Create Identity
        // Note: We cast publicKeys to any to bypass strict 'unknown[]' type issues
        // if the SDK's facade type definition is overly generic.
        const identity = await sdk.identities.create({
            assetLockProof: proof,
            assetLockPrivateKeyWif: wif,
            publicKeys: publicKeysForSdk as any,
        })
        const identityId = typeof identity === 'string' ? identity : identity.id?.()
        if (!identityId) throw new Error('Identity creation failed to return an ID')
        // 2. Register DPNS name
        // Use Index 1 (Auth Critical) for signing
        const authKey = derivedKeys[1]
        await sdk.dpns.registerName({
            label: username,
            identityId,
            publicKeyId: 1,
            privateKeyWif: authKey?.privateKey.toWIF(),
        })
        return identityId
    }
}
